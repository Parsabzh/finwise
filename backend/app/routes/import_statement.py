from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.person import Person
from app.models.transaction import Transaction
from app.ai.category_resolver import resolve_categories
from app.ai.excel_importer import xlsx_to_text
from app.ai.statement_importer import (
    extract_transactions_from_text,
    extract_transactions_from_document,
    ImportError as StatementImportError,
)
from app.ai.gemini_client import gemini_available
from app.config import settings
from app.schemas.import_csv import ParsePreview, ImportCommit, ImportResult

router = APIRouter(prefix="/api/import", tags=["Import"])

# Per-format upload caps. PDF/Excel statements can legitimately be larger
# than a plain CSV (multi-page, formatting), so they get more headroom.
MAX_FILE_BYTES: dict[str, int] = {
    ".csv": 2 * 1024 * 1024,
    ".xlsx": 5 * 1024 * 1024,
    ".pdf": 5 * 1024 * 1024,
}


@router.get("/health")
def import_health() -> dict:
    """Is Gemini configured for the statement import feature?"""
    return {
        "status": "ok" if gemini_available() else "no_api_key",
        "model": settings.gemini_model,
    }


@router.post("/parse", response_model=ParsePreview)
async def parse_statement(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ParsePreview:
    """Upload a bank statement (CSV, Excel, or PDF); Gemini extracts + classifies rows.

    Nothing is written to the database here — the user reviews first.
    """
    extension = Path(file.filename or "").suffix.lower()
    if extension not in MAX_FILE_BYTES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload a CSV, Excel (.xlsx), or PDF file.",
        )

    raw = await file.read()
    if len(raw) > MAX_FILE_BYTES[extension]:
        limit_mb = MAX_FILE_BYTES[extension] // (1024 * 1024)
        raise HTTPException(status_code=413, detail=f"File too large (max {limit_mb} MB).")

    categories = resolve_categories(current_user.id, db)

    try:
        if extension == ".pdf":
            rows = extract_transactions_from_document(raw, "application/pdf", categories)
        else:
            if extension == ".xlsx":
                try:
                    text = xlsx_to_text(raw)
                except StatementImportError as exc:
                    raise HTTPException(status_code=400, detail=str(exc))
            else:
                try:
                    text = raw.decode("utf-8-sig")
                except UnicodeDecodeError:
                    text = raw.decode("latin-1", errors="replace")

            if not text.strip():
                raise HTTPException(status_code=400, detail="The uploaded file is empty.")

            rows = extract_transactions_from_text(text, categories)
    except StatementImportError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    return ParsePreview(count=len(rows), transactions=rows)


@router.post("/commit", response_model=ImportResult, status_code=201)
def commit_import(
    body: ImportCommit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ImportResult:
    """Insert the reviewed transactions, attributing them to an account + person."""
    if not body.transactions:
        raise HTTPException(status_code=400, detail="No transactions to import.")

    # Find the person by name (case-insensitive) or create one for this user.
    name = body.person_name.strip()
    person = (
        db.query(Person)
        .filter(Person.user_id == current_user.id, Person.name.ilike(name))
        .first()
    )
    if person is None:
        person = Person(user_id=current_user.id, name=name)
        db.add(person)
        db.flush()  # assign person.id without ending the transaction

    source = body.source.strip()
    for tx in body.transactions:
        db.add(
            Transaction(
                user_id=current_user.id,
                amount=tx.amount,
                type=tx.type.value,
                category=tx.category,
                description=tx.description,
                date=tx.date,
                source=source,
                ai_category=tx.category,  # Gemini already classified it
                person_id=person.id,
            )
        )

    db.commit()
    return ImportResult(
        imported=len(body.transactions), person_id=person.id, source=source
    )
