from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from datetime import date

from app.database import get_db
from app.models.transaction import Transaction
from app.models.budget import Budget
from app.schemas.summary import SummaryResponse, CategorySummary

from app.models.user import User
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/summary", tags=["Summary"])

@router.get("/", response_model=SummaryResponse)
def get_summary(
    month: str = Query(..., description="Month in YYYY-MM format"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> dict:
    # Parse month string into date range
    year, m = map(int, month.split("-"))
    first_day = date(year, m, 1)
    if m == 12:
        next_month = date(year + 1, 1, 1)
    else:
        next_month = date(year, m + 1, 1)

    # Base filter: this user + this month
    base_filter = [
        Transaction.user_id == current_user.id,
        Transaction.date >= first_day,
        Transaction.date < next_month,
    ]

    # Total income
    total_income = db.query(func.sum(Transaction.amount)).filter(
        *base_filter,
        Transaction.type == "income",
    ).scalar() or 0

    # Total expenses
    total_expenses = db.query(func.sum(Transaction.amount)).filter(
        *base_filter,
        Transaction.type == "expense",
    ).scalar() or 0

    # Spending by category (expenses only)
    category_rows = db.query(
        Transaction.category,
        func.sum(Transaction.amount).label("total"),
    ).filter(
        *base_filter,
        Transaction.type == "expense",
    ).group_by(Transaction.category).all()

    # Get budgets for this month
    budgets = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.month == first_day,
    ).all()

    # Create a lookup: {"Food": 300.00, "Transport": 100.00}
    budget_map = {b.category: b.limit_amount for b in budgets}

    # Build category summaries
    by_category = [
        CategorySummary(
            category=row.category,
            total=row.total,
            budget=budget_map.get(row.category),  # None if no budget set
        )
        for row in category_rows
    ]

    return SummaryResponse(
        month=month,
        total_income=total_income,
        total_expenses=total_expenses,
        net_savings=total_income - total_expenses,
        by_category=by_category,
    )