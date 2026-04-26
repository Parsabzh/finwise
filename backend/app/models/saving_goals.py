import uuid
from datetime import datetime, date

from sqlalchemy import Date, Numeric, String, DateTime, DECIMAL, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

class SavingGoals(Base):
    __tablename__ = "saving_goals"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String)
    target_amount: Mapped[DECIMAL] = mapped_column(Numeric(10, 2))
    current_amount: Mapped[DECIMAL] = mapped_column(Numeric(10, 2), default=0)
    deadline: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())