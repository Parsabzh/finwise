from pydantic import BaseModel, Field
from datetime import date, datetime
import decimal

class BudgetCreate(BaseModel):
    category: str
    limit_amount: decimal.Decimal = Field(gt=0, description="Must be positive")
    month: date

class BudgetResponse(BaseModel):
    id: str
    user_id: str
    category: str
    limit_amount: decimal.Decimal
    month: date
    created_at: datetime

    class Config:
        from_attributes = True