from fastapi import FastAPI
from app.routes.transactions import router as transactions_router
from app.routes.budgets import router as budgets_router



app = FastAPI(title="FinWise", version="0.1.0")

@app.get("/health")

def health():
    return {"status": "ok", "app": "FinWise", "version": "0.1.0"}

app.include_router(transactions_router)
app.include_router(budgets_router)