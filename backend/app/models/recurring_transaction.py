import uuid
from datetime import date, datetime
from sqlalchemy import String, Date, DateTime, Numeric, Boolean, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from decimal import Decimal

from backend.app.database import Base

class RecurringTransaction(Base):
    __tablename__ = "recurring_transactions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"))
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    type: Mapped[str] = mapped_column(String)              # "income" or "expense"
    category: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String)        
    frequency: Mapped[str] = mapped_column(String)          # "monthly", "weekly", "yearly"
    day_of_month: Mapped[int] = mapped_column()             # 1-28
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True, default=None)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())