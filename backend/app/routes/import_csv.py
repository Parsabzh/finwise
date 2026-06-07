from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.person import Person
from app.models.transaction import Transaction
from app.ai.category_resolver import resolve_categories
from app.ai.csv_importer import extract_transactions, ImportError as CsvImportError
from app.ai.gemini_client import gemini_available
from app.config import settings
from app.schemas.import_csv import ParsePreview, ImportCommit, ImportResult

router = APIRouter(prefix="/api/import", tags=["Import"])

MAX_FILE_BYTES = 2 * 1024 * 1024  # 2 MB is plenty for a bank CSV


@router.get("/health")
def import_health() -> dict:
    """Is Gemini configured for the CSV import feature?"""
    return {
        "status": "ok" if gemini_available() else "no_api_key",
        "model": settings.gemini_model,
    }


@router.post("/parse", response_model=ParsePreview)
async def parse_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ParsePreview:
    """Upload a bank CSV, let Gemini extract + classify rows, return a preview.

    Nothing is written to the database here — the user reviews first.
    """
    raw = await file.read()
    if len(raw) > MAX_FILE_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 2 MB).")

    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw.decode("latin-1", errors="replace")

    if not text.strip():
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    categories = resolve_categories(current_user.id, db)
    try:
        rows = extract_transactions(text, categories)
    except CsvImportError as exc:
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
