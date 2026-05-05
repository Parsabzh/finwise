# app/exceptions.py
#
# Exception Hierarchy Pattern:
# We define our own exception types that carry meaning (NotFoundException,
# ForbiddenException, etc.) rather than scattering HTTPException(404) all
# over the codebase. The global handler in error_handlers.py converts these
# into HTTP responses — business logic never needs to know about HTTP status
# codes directly.

from typing import Any


class FinWiseException(Exception):
    """
    Base class for every application-level error.
    Subclasses only need to declare `status_code` and `code` as class vars.
    """
    status_code: int = 500
    code: str = "INTERNAL_ERROR"

    def __init__(self, message: str, details: Any = None):
        self.message = message
        self.details = details
        super().__init__(message)


class NotFoundException(FinWiseException):
    """The resource the caller asked for does not exist."""
    status_code = 404
    code = "NOT_FOUND"


class ForbiddenException(FinWiseException):
    """Authenticated but not allowed to touch this resource (wrong owner)."""
    status_code = 403
    code = "FORBIDDEN"


class ConflictException(FinWiseException):
    """Duplicate — e.g. registering with an e-mail that's already in use."""
    status_code = 409
    code = "CONFLICT"


class UnauthorizedException(FinWiseException):
    """No valid credentials were provided."""
    status_code = 401
    code = "UNAUTHORIZED"


class ValidationException(FinWiseException):
    """
    Business-rule validation that Pydantic cannot catch.
    For example: budget amount must be > 0, date can't be in the future.
    """
    status_code = 422
    code = "VALIDATION_ERROR"
