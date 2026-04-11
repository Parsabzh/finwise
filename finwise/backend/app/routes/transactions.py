from fastapi import APIRouter, Depends, HTTPException,  Query
from typing import Optional
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.transaction import TransactionCreate, TransactionResponse

from app.models.transaction import Transaction
from datetime import date

router = APIRouter(prefix="/api/transactions", tags=["Transactions"])

TEMP_USER_ID = "test-user-123"  # Temporary user ID for testing purposes

@router.post("/", response_model=TransactionResponse, status_code=201)
def create_transaction(data: TransactionCreate, db: Session = Depends(get_db)) -> Transaction:
    transaction = Transaction(**data.model_dump(),
        user_id=TEMP_USER_ID
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction



@router.get("/", response_model=list[TransactionResponse])
def list_transactions(
    month: Optional[str] = Query(None, description="Filter by month: YYYY-MM"),
    category: Optional[str] = Query(None),
    type: Optional[str] = Query(None, description="income or expense"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[Transaction]:

    query = db.query(Transaction).filter(Transaction.user_id == TEMP_USER_ID)
    if month:
        year, month_num = map(int, month.split("-"))
        first_of_month = date(year, month_num, 1)
        if month_num == 12:
            first_of_next_month = date(year + 1, 1, 1)
        else:
            first_of_next_month = date(year, month_num + 1, 1)
        query = query.filter(Transaction.date >= first_of_month, Transaction.date < first_of_next_month)

    if category:
        query = query.filter(Transaction.category == category)
    if type:
        query = query.filter(Transaction.type == type)
    
    return query.offset(skip).limit(limit).all()

@router.put("/{transaction_id}", response_model=TransactionResponse)
def update_transaction(transaction_id: str, data: TransactionCreate, db: Session = Depends(get_db)) -> Transaction:
    
    transaction= db.query(Transaction).filter(Transaction.id == transaction_id, Transaction.user_id == TEMP_USER_ID).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    for key, value in data.model_dump().items():
        setattr(transaction, key, value)
    db.commit()
    db.refresh(transaction)
    return transaction

@router.delete("/{transaction_id}", status_code=204)
def delete_transaction(transaction_id: str, db: Session = Depends(get_db)) -> None:
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id, Transaction.user_id == TEMP_USER_ID).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(transaction)
    db.commit()
    return None