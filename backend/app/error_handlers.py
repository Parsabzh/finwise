# app/error_handlers.py
#
# Each function here is a FastAPI "exception handler" — a safety net
# stretched under the entire app. When an unhandled exception of the
# registered type bubbles up from any route, FastAPI calls the matching
# handler instead of crashing with a raw 500.
#
# All four handlers funnel through a single _error_body() helper so the
# JSON envelope shape is defined in exactly one place. Change it once,
# it changes everywhere.

import logging
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.exceptions import FinWiseException

logger = logging.getLogger(__name__)


def _error_body(code: str, message: str, details=None) -> dict:
    """Owns the error envelope. One place to update the shape."""
    body: dict = {"error": {"code": code, "message": message}}
    if details is not None:
        body["error"]["details"] = details
    return body


async def finwise_exception_handler(
    request: Request, exc: FinWiseException
) -> JSONResponse:
    """Handles every custom exception raised in services and routes."""
    # Log server-side faults (5xx) but not expected client errors (4xx).
    if exc.status_code >= 500:
        logger.exception("Server error on %s %s: %s", request.method, request.url, exc.message)
    return JSONResponse(
        status_code=exc.status_code,
        content=_error_body(exc.code, exc.message, exc.details),
    )


async def http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    """
    Catches FastAPI's own HTTPException — raised by Depends(), security
    middleware, and any route still using the old style. Wraps it in our
    consistent envelope so the frontend always gets the same shape.
    """
    return JSONResponse(
        status_code=exc.status_code,
        content=_error_body("HTTP_ERROR", str(exc.detail)),
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """
    Pydantic schema failures (wrong types, missing fields).
    Converts Pydantic's nested error list into a flat, readable array.
    """
    errors = [
        {
            "field": " → ".join(str(part) for part in e["loc"]),
            "message": e["msg"],
        }
        for e in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content=_error_body("VALIDATION_ERROR", "Request validation failed", errors),
    )


async def unhandled_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    """
    Last-resort catch-all. Anything we didn't anticipate lands here.
    We return a clean 500 and log the full traceback server-side.
    """
    logger.exception("Unhandled exception on %s %s", request.method, request.url)
    return JSONResponse(
        status_code=500,
        content=_error_body("INTERNAL_ERROR", "An unexpected error occurred."),
    )
