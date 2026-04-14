from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    app_name: str = "FinWise"

    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    remember_me_expire_minutes: int = 60 * 24 * 30  # 30 days in minutes
    reset_token_expire_minutes: int = 15  # password reset tokens expire in 15 minutes
    frontend_url: str = "http://localhost:3000"

    # SMTP/email settings (leave empty to log reset links in dev)
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from: str = "no-reply@finwise.local"
    
    class Config:
        env_file = ".env"

settings = Settings()