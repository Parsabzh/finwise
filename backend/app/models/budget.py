import uuid
from datetime import datetime, date

from sqlalchemy import Date, Numeric, String, DateTime, DECIMAL, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.database import Base

class Budget(Base):
    __tablename__ = "budgets"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"))
    category: Mapped[str] = mapped_column(String)
    limit_amount: Mapped[DECIMAL] = mapped_column(Numeric(10, 2))
    month: Mapped[date] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now()) 