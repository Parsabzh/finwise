from fastapi import APIRouter, Depends, HTTPException,  Query
from typing import Optional
from sqlalchemy import extract
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.budget import BudgetCreate, BudgetResponse

from app.models.budget import Budget
from datetime import date   

router = APIRouter(prefix="/api/budgets", tags=["Budgets"])
TEMP_USER_ID = "test-user-123"  # Temporary user ID for testing purposes

@router.post("/", response_model=BudgetResponse, status_code=201)
def create_budget(data: BudgetCreate, db: Session = Depends(get_db)) -> Budget:
    budget = Budget(**data.model_dump(),
        user_id=TEMP_USER_ID
    )
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget

@router.get("/", response_model=list[BudgetResponse])
def list_budgets(
    month: Optional[str] = Query(None, description="Filter by month: YYYY-MM"),
    category: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[Budget]:

    query = db.query(Budget).filter(Budget.user_id == TEMP_USER_ID)
    if month:
        year, month_num = map(int, month.split("-"))
        first_day = date(year, month_num, 1)
        query = query.filter(Budget.month == first_day)

    if category:
            query = query.filter(Budget.category == category)
    
    return query.offset(skip).limit(limit).all()

@router.put("/{budget_id}", response_model=BudgetResponse)
def update_budget(budget_id: str, data: BudgetCreate, db: Session = Depends(get_db)) -> Budget:
    
    budget= db.query(Budget).filter(Budget.id == budget_id, Budget.user_id == TEMP_USER_ID).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    for key, value in data.model_dump().items():
        setattr(budget, key, value)
    db.commit()
    db.refresh(budget)
    return budget

@router.delete("/{budget_id}", status_code=204)
def delete_budget(budget_id: str, db: Session = Depends(get_db)) -> None:
    budget = db.query(Budget).filter(Budget.id == budget_id, Budget.user_id == TEMP_USER_ID).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    db.delete(budget)
    db.commit()
    return None