from sqlalchemy.orm import Session

from app.ai.categories import DEFAULT_CATEGORIES
from app.models.transaction import Transaction


def resolve_categories(user_id: str, db: Session) -> list[str]:
    """
    Return the full category list for a user: defaults + any custom categories
    they have already used on their transactions (discovered organically from DB).
    """
    rows = (
        db.query(Transaction.category)
        .filter(Transaction.user_id == user_id)
        .distinct()
        .all()
    )
    user_cats = {row[0].strip().lower() for row in rows if row[0]}
    defaults = set(DEFAULT_CATEGORIES)

    # Custom = categories the user has used that aren't in defaults
    custom = sorted(user_cats - defaults)
    return list(DEFAULT_CATEGORIES) + custom
