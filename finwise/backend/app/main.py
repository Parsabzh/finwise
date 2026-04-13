from fastapi import FastAPI
from app.routes.transactions import router as transactions_router
from app.routes.budgets import router as budgets_router
from app.routes.saving_goals import router as saving_goals_router
from app.routes.summary import router as summary_router
from app.routes.recurring import router as recurring_router
from app.routes.auth import router as auth_router



app = FastAPI(title="FinWise", version="0.1.0")

@app.get("/health")

def health():
    return {"status": "ok", "app": "FinWise", "version": "0.1.0"}

app.include_router(transactions_router)
app.include_router(budgets_router)
app.include_router(saving_goals_router)
app.include_router(summary_router)
app.include_router(recurring_router)
app.include_router(auth_router)