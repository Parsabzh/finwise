from pydantic import BaseModel, Field
from datetime import date, datetime
from decimal import Decimal

class RecurringTransactionCreate(BaseModel):
    amount: Decimal = Field(gt=0)
    type: str
    category: str
    description: str
    frequency: str
    day_of_month: int = Field(ge=1, le=28)
    start_date: date
    end_date: date | None = None
    is_active: bool = True

class RecurringTransactionResponse(BaseModel):
    id: str
    user_id: str
    amount: Decimal
    type: str
    category: str
    description: str
    frequency: str
    day_of_month: int
    start_date: date
    end_date: date | None = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True