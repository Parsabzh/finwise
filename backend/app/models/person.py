import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base


class Person(Base):
    __tablename__ = "persons"

    id:         Mapped[str]      = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id:    Mapped[str]      = mapped_column(String, ForeignKey("users.id"))
    name:       Mapped[str]      = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    transactions = relationship("Transaction", back_populates="person")