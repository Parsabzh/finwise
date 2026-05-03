from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.person import Person
from app.schemas.person import PersonCreate, PersonUpdate, PersonOut

router = APIRouter(prefix="/api/persons", tags=["persons"])


@router.get("/", response_model=list[PersonOut])
def list_persons(
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    """Return all persons belonging to this user, alphabetically sorted."""
    return (
        db.query(Person)
        .filter(Person.user_id == current_user.id)
        .order_by(Person.name)  # alphabetical — makes the dropdown easier to scan
        .all()
    )


@router.post("/", response_model=PersonOut, status_code=status.HTTP_201_CREATED)
def create_person(
    body:         PersonCreate,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    # Prevent duplicate names per user (case-insensitive)
    existing = (
        db.query(Person)
        .filter(Person.user_id == current_user.id, Person.name.ilike(body.name))
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="A person with this name already exists.")

    person = Person(user_id=current_user.id, name=body.name.strip())
    db.add(person)
    db.commit()
    db.refresh(person)
    return person


@router.put("/{person_id}", response_model=PersonOut)
def update_person(
    person_id: UUID,
    body:      PersonUpdate,
    db:        Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    person = db.query(Person).filter(
        Person.id == person_id, Person.user_id == current_user.id  # data isolation
    ).first()

    if not person:
        raise HTTPException(status_code=404, detail="Person not found.")

    person.name = body.name.strip()
    db.commit()
    db.refresh(person)
    return person


@router.delete("/{person_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_person(
    person_id: UUID,
    db:        Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    person = db.query(Person).filter(
        Person.id == person_id, Person.user_id == current_user.id
    ).first()

    if not person:
        raise HTTPException(status_code=404, detail="Person not found.")

    db.delete(person)
    db.commit()