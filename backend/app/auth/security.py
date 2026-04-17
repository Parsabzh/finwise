from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone as tz

from jose import jwt, JWTError
from backend.app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """One-way hash. You can never get the original password back from this."""
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Hash the input and compare it to the stored hash."""
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(user_id: str, expires_minutes: int | None = None) -> str:
    """Build a JWT with the user's ID as the subject claim.
    `expires_minutes` overrides the default access token lifespan when provided."""
    expire = datetime.now(tz.utc) + timedelta(minutes=(expires_minutes or settings.access_token_expire_minutes))
    payload = {
        "sub": user_id,
        "type": "access",
        "exp": expire,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_access_token(token: str) -> str | None:
    """Decode a JWT and return the user_id, or None if invalid/expired."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return payload.get("sub") 
    except JWTError:
        return None


def create_password_reset_token(user_id: str) -> str:
    """Create a short-lived JWT used for password reset flows."""
    expire = datetime.now(tz.utc) + timedelta(minutes=settings.reset_token_expire_minutes)
    payload = {
        "sub": user_id,
        "type": "pw_reset",
        "exp": expire,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_password_reset_token(token: str) -> str | None:
    """Decode a password-reset token and return the user_id if valid."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        if payload.get("type") != "pw_reset":
            return None
        return payload.get("sub")
    except JWTError:
        return None
