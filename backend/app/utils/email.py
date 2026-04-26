import smtplib
import logging
from email.message import EmailMessage

from app.config import settings

logger = logging.getLogger(__name__)


def send_password_reset_email(to_email: str, reset_link: str) -> None:
    subject = f"{settings.app_name} — Password reset"
    body = f"Hello,\n\nTo reset your password, click the link below:\n\n{reset_link}\n\nIf you did not request a password reset, you can ignore this message.\n\nThanks,\n{settings.app_name}"

    # If no SMTP configured, fall back to logging the reset link (useful for dev)
    if not settings.smtp_host:
        logger.info("Password reset link for %s: %s", to_email, reset_link)
        return

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from
    msg["To"] = to_email
    msg.set_content(body)

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            if settings.smtp_user and settings.smtp_password:
                server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)
    except Exception:
        logger.exception("Failed to send password reset email to %s", to_email)
