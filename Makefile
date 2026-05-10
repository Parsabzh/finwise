SUPABASE_URL := postgresql://postgres.dmsjszlaipwppyfbdteg:ZZdyPPQbNRtnQ3Pg@aws-1-eu-west-2.pooler.supabase.com:5432/postgres

.PHONY: backend frontend dev db db-stop install kill migrate-prod revision-prod

# Start only the database
db:
	sudo docker compose up -d db

# Stop the database container
db-stop:
	sudo docker compose stop db

# Start backend (db starts automatically via depends_on)
backend:
	sudo docker compose up -d backend

# Start frontend
frontend:
	sudo docker compose up -d frontend

# Install dependencies (both sides)
install:
	cd frontend && npm install
	cd backend && pip install -r requirements.txt

# Run all services with live logs
dev:
	sudo docker compose up --build

# Run alembic migrations locally
migrate:
	cd backend && DATABASE_URL=postgresql://finwise:finwise123@localhost:5433/finwise PYTHONPATH=. alembic upgrade head

# Generate a new migration: make revision m="your message"
revision:
	cd backend && DATABASE_URL=postgresql://finwise:finwise123@localhost:5433/finwise PYTHONPATH=. alembic revision --autogenerate -m "$(m)"

# Apply all pending migrations to Supabase (production)
migrate-prod:
	cd backend && DATABASE_URL=$(SUPABASE_URL) PYTHONPATH=. alembic upgrade head

# Generate a new migration against Supabase: make revision-prod m="your message"
revision-prod:
	cd backend && DATABASE_URL=$(SUPABASE_URL) PYTHONPATH=. alembic revision --autogenerate -m "$(m)"

# Stop and remove all containers
kill:
	sudo docker compose down