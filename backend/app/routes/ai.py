from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db, SessionLocal
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.transaction import Transaction
from app.ai.categories import DEFAULT_CATEGORIES
from app.ai.category_resolver import resolve_categories
from app.ai.categorizer import categorize
from app.ai.ollama_client import ollama_available, ollama_generate, OLLAMA_URL, OLLAMA_MODEL

router = APIRouter(prefix="/api/ai", tags=["AI"])


@router.get("/health")
def ollama_health() -> dict:
    """Check if Ollama is reachable and the model responds."""
    if not ollama_available():
        return {"status": "unreachable", "url": OLLAMA_URL, "model": OLLAMA_MODEL}
    test = ollama_generate("Reply with the single word: ok")
    return {
        "status": "ok" if test else "model_error",
        "url": OLLAMA_URL,
        "model": OLLAMA_MODEL,
        "response": test,
    }


@router.get("/categories/defaults")
def get_default_categories() -> list[str]:
    """Public — seed list of built-in categories for dropdowns before login."""
    return list(DEFAULT_CATEGORIES)


@router.get("/categories")
def get_user_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[str]:
    """Authenticated — default categories merged with any custom ones the user has used."""
    return resolve_categories(current_user.id, db)


@router.post("/categorize-all", status_code=202)
def batch_categorize(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Re-categorize every transaction that has no ai_category yet.
    Runs synchronously (returns when done). Use sparingly on large datasets.
    """
    pending = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.ai_category.is_(None),
        )
        .all()
    )

    if not pending:
        return {"categorized": 0, "skipped": 0}

    categories = resolve_categories(current_user.id, db)
    categorized = 0
    skipped = 0

    for tx in pending:
        result = categorize(tx.description, categories)
        if result:
            tx.ai_category = result
            categorized += 1
        else:
            skipped += 1

    db.commit()
    return {"categorized": categorized, "skipped": skipped}
