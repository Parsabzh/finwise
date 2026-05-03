from pydantic import BaseModel, Field, model_validator
from datetime import date, datetime
from enum import Enum
from typing import Any
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
    source: str | None = None
    person_id: str | None = None

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
    person_id: str | None = None
    person_name: str | None = None

    @model_validator(mode="before")
    @classmethod
    def extract_person_name(cls, data: Any) -> Any:
        if hasattr(data, "person") and data.person is not None:
            data.__dict__["person_name"] = data.person.name
        return data

    class Config:
        from_attributes = True
