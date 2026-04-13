# app/auth/security.py
from passlib.context import CryptContext


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """One-way hash. You can never get the original password back from this."""
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Hash the input and compare it to the stored hash."""
    return pwd_context.verify(plain_password, hashed_password)