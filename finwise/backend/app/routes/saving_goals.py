from fastapi import APIRouter, Depends, HTTPException,  Query
from typing import Optional
from sqlalchemy import extract, or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.saving_goals import SavingGoalCreate, SavingGoalResponse

from app.models.saving_goals import SavingGoals
from datetime import date 

router = APIRouter(prefix="/api/saving-goals", tags=["Saving Goals"])
TEMP_USER_ID = "test-user-123"  # Temporary user ID for testing purposes

@router.post("/", response_model=SavingGoalResponse, status_code=201)
def create_saving_goal(data: SavingGoalCreate, db: Session = Depends(get_db)) -> SavingGoals:
    saving_goal = SavingGoals(**data.model_dump(),
        user_id=TEMP_USER_ID
    )
    db.add(saving_goal)
    db.commit()
    db.refresh(saving_goal)
    return saving_goal

@router.get("/", response_model=list[SavingGoalResponse])
def list_savings_goals(
    status: Optional[str] = Query(None, description="active, completed, or expired"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[SavingGoals]:

    query = db.query(SavingGoals).filter(SavingGoals.user_id == TEMP_USER_ID)
    if status:
        today = date.today()
        if status == "active":
            query = query.filter(
                SavingGoals.current_amount < SavingGoals.target_amount,
                or_(SavingGoals.deadline == None, SavingGoals.deadline >= today)
            )
        elif status == "completed":
            query = query.filter(SavingGoals.current_amount >= SavingGoals.target_amount)
        elif status == "expired":
            query = query.filter(SavingGoals.deadline < today, SavingGoals.current_amount < SavingGoals.target_amount)
    
    return query.offset(skip).limit(limit).all()

@router.put("/{goal_id}", response_model=SavingGoalResponse)
def update_saving_goal(goal_id: str, data: SavingGoalCreate, db: Session = Depends(get_db)) -> SavingGoals:
    
    saving_goal= db.query(SavingGoals).filter(SavingGoals.id == goal_id, SavingGoals.user_id == TEMP_USER_ID).first()
    if not saving_goal:
        raise HTTPException(status_code=404, detail="Saving Goal not found")
    for key, value in data.model_dump().items():
        setattr(saving_goal, key, value)
    db.commit()
    db.refresh(saving_goal)
    return saving_goal

@router.delete("/{goal_id}", status_code=204)
def delete_saving_goal(goal_id: str, db: Session = Depends(get_db)) -> None:
    saving_goal = db.query(SavingGoals).filter(SavingGoals.id == goal_id, SavingGoals.user_id == TEMP_USER_ID).first()
    if not saving_goal:
        raise HTTPException(status_code=404, detail="Saving Goal not found")
    db.delete(saving_goal)
    db.commit()
    return None

