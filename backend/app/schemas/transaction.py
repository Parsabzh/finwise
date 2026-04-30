from pydantic import BaseModel, Field
from datetime import date, datetime
from enum import Enum
import decimal

class TransactionType(str, Enum):
    income = "income"
    expense = "expense"

class TransactionCreate(BaseModel):
    amount: decimal.Decimal = Field(gt=0, description="Must be positive")
    type: TransactionType
    category: str
    description: str
    date: date
    # Optional — user picks ING, ABN, CREDIT, or leaves it blank
    source: str | None = None

class TransactionResponse(BaseModel):
    id: str
    user_id: str
    amount: decimal.Decimal
    type: str
    category: str
    description: str
    date: date
    ai_category: str | None
    source: str | None
    created_at: datetime

    class Config:
        from_attributes = True
