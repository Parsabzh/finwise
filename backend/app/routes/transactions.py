from fastapi import APIRouter, BackgroundTasks, Depends, Query
from typing import Optional
from sqlalchemy.orm import Session, joinedload
from datetime import date

from app.database import get_db, SessionLocal
from app.schemas.transaction import TransactionCreate, TransactionResponse
from app.models.transaction import Transaction
from app.models.user import User
from app.auth.dependencies import get_current_user
from app.exceptions import NotFoundException, ForbiddenException

router = APIRouter(prefix="/api/transactions", tags=["Transactions"])


def _ai_categorize(transaction_id: str, user_id: str) -> None:
    """Background task: call Ollama to fill in ai_category for one transaction."""
    from app.ai.categorizer import categorize
    from app.ai.category_resolver import resolve_categories

    db = SessionLocal()
    try:
        tx = db.query(Transaction).filter(Transaction.id == transaction_id).first()
        if tx is None:
            return
        categories = resolve_categories(user_id, db)
        result = categorize(tx.description, categories)
        if result:
            tx.ai_category = result
            db.commit()
    finally:
        db.close()


@router.post("/", response_model=TransactionResponse, status_code=201)
def create_transaction(
    data: TransactionCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Transaction:
    transaction = Transaction(**data.model_dump(), user_id=current_user.id)
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    background_tasks.add_task(_ai_categorize, transaction.id, current_user.id)
    return transaction


@router.get("/", response_model=list[TransactionResponse])
def list_transactions(
    month: Optional[str] = Query(None, description="Filter by month: YYYY-MM"),
    category: Optional[str] = Query(None),
    type: Optional[str] = Query(None, description="income or expense"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> list[Transaction]:

    query = (
        db.query(Transaction)
        .options(joinedload(Transaction.person))
        .filter(Transaction.user_id == current_user.id)
    )

    if month:
        year, month_num = map(int, month.split("-"))
        first_of_month = date(year, month_num, 1)
        first_of_next_month = date(year + 1, 1, 1) if month_num == 12 else date(year, month_num + 1, 1)
        query = query.filter(Transaction.date >= first_of_month, Transaction.date < first_of_next_month)

    if category:
        query = query.filter(Transaction.category == category)
    if type:
        query = query.filter(Transaction.type == type)

    return query.order_by(Transaction.date.desc(), Transaction.created_at.desc()).offset(skip).limit(limit).all()


@router.put("/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
    transaction_id: str,
    data: TransactionCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Transaction:
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
    ).first()

    if not transaction:
        raise NotFoundException("Transaction not found")

    # Ownership check: a 403 is more informative than pretending it doesn't exist.
    # Use 404 if you prefer not to leak existence; 403 is more correct when authenticated.
    if transaction.user_id != current_user.id:
        raise ForbiddenException("You do not have permission to edit this transaction")

    for key, value in data.model_dump().items():
        setattr(transaction, key, value)
    transaction.ai_category = None  # reset so background task re-categorizes

    db.commit()
    db.refresh(transaction)
    background_tasks.add_task(_ai_categorize, transaction.id, current_user.id)
    return transaction


@router.delete("/{transaction_id}", status_code=204)
def delete_transaction(
    transaction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> None:
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
    ).first()

    if not transaction:
        raise NotFoundException("Transaction not found")

    if transaction.user_id != current_user.id:
        raise ForbiddenException("You do not have permission to delete this transaction")

    db.delete(transaction)
    db.commit()
