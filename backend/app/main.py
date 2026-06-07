from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.routes.transactions import router as transactions_router
from app.routes.budgets import router as budgets_router
from app.routes.saving_goals import router as saving_goals_router
from app.routes.summary import router as summary_router
from app.routes.recurring import router as recurring_router
from app.routes.auth import router as auth_router
from app.routes.person import router as persons_router
from app.routes.ai import router as ai_router
from app.routes.users import router as users_router
from app.routes.import_csv import router as import_router

from app.exceptions import FinWiseException
from app.error_handlers import (
    finwise_exception_handler,
    http_exception_handler,
    validation_exception_handler,
    unhandled_exception_handler,
)

app = FastAPI(title="FinWise", version="0.1.0")

# ── Global exception handlers ────────────────────────────────────────────────
app.add_exception_handler(FinWiseException, finwise_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

@app.get("/health")
def health():
    return {"status": "ok", "app": "FinWise", "version": "0.1.0"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3002",
        "http://127.0.0.1:3002",
        "https://finwise-frontend-delta.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(transactions_router)
app.include_router(budgets_router)
app.include_router(saving_goals_router)
app.include_router(summary_router)
app.include_router(recurring_router)
app.include_router(auth_router)
app.include_router(persons_router)
app.include_router(ai_router)
app.include_router(users_router)
app.include_router(import_router)