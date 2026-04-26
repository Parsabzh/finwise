import enum
import uuid
from datetime import datetime, timezone as tz
from datetime import date as date_type
from sqlalchemy import Date, Enum, Numeric, String, DateTime, DECIMAL, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

class TransactionType(enum.Enum):
    income = "income"
    expense = "expense"

class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"))
    amount: Mapped[DECIMAL] = mapped_column(Numeric(10, 2))
    type: Mapped[str] = mapped_column(Enum(TransactionType, native_enum=False, values_callable=lambda x: [e.value for e in x]))
    category: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String)
    date: Mapped[date_type] = mapped_column(Date)
    ai_category: Mapped[str | None] = mapped_column(String, nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())