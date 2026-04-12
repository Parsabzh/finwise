from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.recurring_transaction import RecurringTransaction
from app.schemas.recurring_transaction import RecurringTransactionCreate, RecurringTransactionResponse
from app.services.recurring_service import process_recurring_transactions

router = APIRouter(prefix="/api/recurring", tags=["Recurring Transactions"])

TEMP_USER_ID = "test-user-123"

@router.post("/", response_model=RecurringTransactionResponse, status_code=201)
def create_recurring(data: RecurringTransactionCreate, db: Session = Depends(get_db)) -> RecurringTransaction:
    rule = RecurringTransaction(**data.model_dump(), user_id=TEMP_USER_ID)
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule

@router.get("/", response_model=list[RecurringTransactionResponse])
def list_recurring(db: Session = Depends(get_db)) -> list[RecurringTransaction]:
    return db.query(RecurringTransaction).filter(
        RecurringTransaction.user_id == TEMP_USER_ID
    ).all()

@router.put("/{rule_id}", response_model=RecurringTransactionResponse)
def update_recurring(rule_id: str, data: RecurringTransactionCreate, db: Session = Depends(get_db)) -> RecurringTransaction:
    rule = db.query(RecurringTransaction).filter(
        RecurringTransaction.id == rule_id,
        RecurringTransaction.user_id == TEMP_USER_ID
    ).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")
    for key, value in data.model_dump().items():
        setattr(rule, key, value)
    db.commit()
    db.refresh(rule)
    return rule

@router.delete("/{rule_id}", status_code=204)
def delete_recurring(rule_id: str, db: Session = Depends(get_db)) -> None:
    rule = db.query(RecurringTransaction).filter(
        RecurringTransaction.id == rule_id,
        RecurringTransaction.user_id == TEMP_USER_ID
    ).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")
    db.delete(rule)
    db.commit()
    return None

# Manual trigger for testing — remove in production
@router.post("/trigger", status_code=200)
def trigger_recurring(db: Session = Depends(get_db)) -> dict:
    count = process_recurring_transactions(db)
    return {"message": f"Created {count} transactions"}