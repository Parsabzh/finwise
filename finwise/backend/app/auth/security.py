from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone as tz

from jose import jwt, JWTError
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """One-way hash. You can never get the original password back from this."""
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Hash the input and compare it to the stored hash."""
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(user_id: str) -> str:
    """Build a JWT with the user's ID as the subject claim."""
    expire = datetime.now(tz.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": user_id,   
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
