from pydantic import BaseModel
import decimal

class CategorySummary(BaseModel):
    category: str
    total: decimal.Decimal
    budget: decimal.Decimal | None = None  # None if no budget set for this category

class SummaryResponse(BaseModel):
    month: str
    total_income: decimal.Decimal
    total_expenses: decimal.Decimal
    net_savings: decimal.Decimal
    by_category: list[CategorySummary]