from datetime import date
from sqlalchemy.orm import Session
from backend.app.models.recurring_transaction import RecurringTransaction
from backend.app.models.transaction import Transaction
import uuid

def process_recurring_transactions(db: Session) -> int:
    """Check all active recurring transactions and create any that are due today."""
    today = date.today()
    created_count = 0

    # Step 1: Find all active rules where today matches
    rules = db.query(RecurringTransaction).filter(
        RecurringTransaction.is_active == True,
        RecurringTransaction.start_date <= today,
        RecurringTransaction.day_of_month == today.day,
    ).all()

    for rule in rules:
        # Step 2: Skip if past end_date
        if rule.end_date and rule.end_date < today:
            continue

        # Step 3: Check if already created for this month (prevent duplicates)
        existing = db.query(Transaction).filter(
            Transaction.user_id == rule.user_id,
            Transaction.description == rule.description,
            Transaction.amount == rule.amount,
            Transaction.date == today,
        ).first()

        if existing:
            continue

        # Step 4: Create the actual transaction
        transaction = Transaction(
            id=str(uuid.uuid4()),
            user_id=rule.user_id,
            amount=rule.amount,
            type=rule.type,
            category=rule.category,
            description=rule.description,
            date=today,
        )
        db.add(transaction)
        created_count += 1

    db.commit()
    return created_count