.PHONY: backend frontend dev install kill

# Run FastAPI backend
backend:
	cd backend && PYTHONPATH=. python -m uvicorn app.main:app --reload --port 8000

# Run frontend (React/Vite/etc.)
frontend:
	cd frontend && npm run dev

# Install dependencies (both sides)
install:
	cd frontend && npm install
	cd backend && pip install -r requirements.txt

# Run both backend + frontend together
dev:
	make -j2 backend frontend

# Kill processes running on ports (fix common issues)
kill:
	lsof -ti:8000 | xargs kill -9 || true
	lsof -ti:3000 | xargs kill -9 || true