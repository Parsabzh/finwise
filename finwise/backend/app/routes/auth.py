from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    UserCreate,
    UserResponse,
    LoginRequest,
    TokenResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from app.auth.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_password_reset_token,
    decode_password_reset_token,
)
from app.utils.email import send_password_reset_email
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(data: UserCreate, db: Session = Depends(get_db)):
    # Check for existing user BEFORE attempting insert
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    user = User(
        email=data.email,
        name=data.name,
        hashed_password=hash_password(data.password),  # hash before storing
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/login", response_model=TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    remember_me: bool = False,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    expires = settings.remember_me_expire_minutes if remember_me else None
    token = create_access_token(user_id=user.id, expires_minutes=expires)
    return TokenResponse(access_token=token)



@router.post("/login/json", response_model=TokenResponse)
def login_json(data: LoginRequest, remember_me: bool = False, db: Session = Depends(get_db)):
    """JSON-friendly login endpoint (useful for SPA frontends)."""
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    expires = settings.remember_me_expire_minutes if remember_me else None
    token = create_access_token(user_id=user.id, expires_minutes=expires)
    return TokenResponse(access_token=token)


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Generate a password reset token and email a reset link if the email exists.
    Always return a generic success message to avoid account enumeration."""
    user = db.query(User).filter(User.email == request.email).first()
    if user:
        token = create_password_reset_token(user.id)
        reset_link = f"{settings.frontend_url.rstrip('/')}/reset-password?token={token}"
        send_password_reset_email(user.email, reset_link)

    return {"message": "If an account with that email exists, a reset link has been sent."}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset a user's password using a valid reset token."""
    user_id = decode_password_reset_token(request.token)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.hashed_password = hash_password(request.new_password)
    db.add(user)
    db.commit()
    return {"message": "Password has been reset successfully."}