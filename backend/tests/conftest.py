# tests/conftest.py
#
# conftest.py is pytest's special config file. Any fixture defined here
# is automatically available to every test file in the same directory —
# no import needed. Think of it as a shared toolbox.
#
# What this file sets up:
#   1. A SQLite test database (isolated from your real PostgreSQL)
#   2. A `db_session` fixture — a clean DB connection per test
#   3. A `client` fixture — an HTTP test client wired to the test DB
#   4. `registered_user` and `auth_headers` helpers for auth tests

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Import Base first, then ALL models so SQLAlchemy knows about every table
# before we call create_all(). Without this, create_all() only creates tables
# for models it has seen. The models/__init__.py does exactly this import.
from app.database import Base, get_db
import app.models  # noqa: F401 — registers User, Transaction, Budget, Person, etc. with Base

from app.main import app

# ── Test database ─────────────────────────────────────────────────────────────
# SQLite file-based DB: fast, no server needed, auto-deleted after tests.
# "check_same_thread": False — SQLite's default is to refuse multi-thread use;
# this flag relaxes it for the test runner.
TEST_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ── Schema lifecycle ──────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def reset_db():
    """
    Runs automatically before and after EVERY test (autouse=True).
    
    Pattern: Fresh Schema per Test.
    We create all tables, run the test, then drop all tables.
    This guarantees zero state leakage between tests.
    
    With SQLite it takes ~5ms per test — fast enough that we don't need
    the more complex "transaction rollback" approach.
    """
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


# ── DB session ────────────────────────────────────────────────────────────────

@pytest.fixture()
def db_session(reset_db):
    """A clean SQLAlchemy session for one test."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


# ── HTTP client ───────────────────────────────────────────────────────────────

@pytest.fixture()
def client(db_session):
    """
    TestClient wired to the test database via FastAPI's Dependency Override.
    
    Dependency Override is the key mechanism here:
    - Normally, every route calls `get_db()` which opens a PostgreSQL connection.
    - We tell FastAPI: "whenever a route asks for `get_db`, give it THIS
      function instead" — one that returns our SQLite test session.
    - The route code never changes. Only the wiring changes.
    - This is Dependency Injection in action.
    """
    def override_get_db():
        try:
            yield db_session
        finally:
            pass  # session lifecycle managed by db_session fixture

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    # Always clean up overrides so one test never bleeds into another.
    app.dependency_overrides.clear()


# ── Auth helpers ──────────────────────────────────────────────────────────────

TEST_USER = {
    "email": "test@finwise.io",
    "name": "Test User",
    "password": "SecurePass123",
}


@pytest.fixture()
def registered_user(client):
    """Registers a fresh user and returns their payload."""
    client.post("/api/auth/register", json=TEST_USER)
    return TEST_USER


@pytest.fixture()
def auth_headers(client, registered_user):
    """
    Logs in via the JSON endpoint and returns an Authorization header dict.
    Usage: client.get("/api/transactions/", headers=auth_headers)
    """
    resp = client.post(
        "/api/auth/login/json",
        json={"email": registered_user["email"], "password": registered_user["password"]},
    )
    assert resp.status_code == 200, f"Login failed in fixture: {resp.json()}"
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
