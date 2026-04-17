from pydantic import BaseModel, Field
from datetime import date, datetime
import decimal

class SavingGoalCreate(BaseModel):
    name: str
    target_amount: decimal.Decimal = Field(gt=0, description="Must be positive")
    deadline: date | None = None

class SavingGoalResponse(BaseModel):
    id: str
    name: str
    target_amount: decimal.Decimal
    current_amount: decimal.Decimal
    deadline: date | None = None
    created_at: datetime
    class Config:
        from_attributes = True
