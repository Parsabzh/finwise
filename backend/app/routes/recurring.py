from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.recurring_transaction import RecurringTransaction
from backend.app.schemas.recurring_transaction import RecurringTransactionCreate, RecurringTransactionResponse
from backend.app.services.recurring_service import process_recurring_transactions
from backend.app.models.user import User
from backend.app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/recurring", tags=["Recurring Transactions"])


@router.post("/", response_model=RecurringTransactionResponse, status_code=201)
def create_recurring(data: RecurringTransactionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> RecurringTransaction:
    rule = RecurringTransaction(**data.model_dump(), user_id=current_user.id)
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule

@router.get("/", response_model=list[RecurringTransactionResponse])
def list_recurring(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> list[RecurringTransaction]:
    return db.query(RecurringTransaction).filter(
        RecurringTransaction.user_id == current_user.id
    ).all()

@router.put("/{rule_id}", response_model=RecurringTransactionResponse)
def update_recurring(rule_id: str, data: RecurringTransactionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> RecurringTransaction:
    rule = db.query(RecurringTransaction).filter(
        RecurringTransaction.id == rule_id,
        RecurringTransaction.user_id == current_user.id
    ).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")
    for key, value in data.model_dump().items():
        setattr(rule, key, value)
    db.commit()
    db.refresh(rule)
    return rule

@router.delete("/{rule_id}", status_code=204)
def delete_recurring(rule_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> None:
    rule = db.query(RecurringTransaction).filter(
        RecurringTransaction.id == rule_id,
        RecurringTransaction.user_id == current_user.id
    ).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")
    db.delete(rule)
    db.commit()
    return None

# Manual trigger for testing — remove in production
@router.post("/trigger", status_code=200)
def trigger_recurring(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> dict:
    count = process_recurring_transactions(db)
    return {"message": f"Created {count} transactions"}

@router.post("/process")
def process_recurring_cron(
    request: Request,
    db: Session = Depends(get_db)
) -> dict:
    # Security — verify the request is from Vercel cron, not a random caller
    # Vercel sends our secret in the Authorization header
    auth_header = request.headers.get("authorization", "")
    cron_secret = os.getenv("CRON_SECRET", "")

    if not cron_secret or auth_header != f"Bearer {cron_secret}":
        raise HTTPException(status_code=401, detail="Unauthorized")

    count = process_recurring_transactions(db)
    return {"processed": count}