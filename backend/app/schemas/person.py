from pydantic import BaseModel, Field
from datetime import datetime


class PersonCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class PersonUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class PersonOut(BaseModel):
    id: str
    name: str
    created_at: datetime

    class Config:
        from_attributes = True
