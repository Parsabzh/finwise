import decimal
from datetime import date

from pydantic import BaseModel, Field

from app.schemas.transaction import TransactionType


class ParsedTransaction(BaseModel):
    """One transaction extracted by Gemini, shown in the preview before commit."""
    date: date
    description: str
    amount: decimal.Decimal = Field(gt=0)
    type: TransactionType
    category: str


class ParsePreview(BaseModel):
    count: int
    transactions: list[ParsedTransaction]


class ImportCommit(BaseModel):
    """Payload the frontend posts to actually insert the reviewed transactions."""
    source: str = Field(min_length=1, description="Bank account the rows belong to")
    person_name: str = Field(min_length=1, description="Person to attribute rows to")
    transactions: list[ParsedTransaction]


class ImportResult(BaseModel):
    imported: int
    person_id: str
    source: str
