# tests/test_auth.py
#
# Covers: registration, JSON login, protected route access.
# We use the /api/auth/login/json endpoint (JSON body) not /api/auth/login
# (OAuth2 form data) because TestClient sends JSON by default.


class TestRegistration:
    def test_register_success(self, client):
        resp = client.post("/api/auth/register", json={
            "email": "new@finwise.io",
            "name": "New User",
            "password": "SecurePass123",
        })
        assert resp.status_code == 201
        body = resp.json()
        assert body["email"] == "new@finwise.io"
        assert body["name"] == "New User"
        assert "id" in body
        # Password must NEVER appear in any response — not even hashed.
        assert "password" not in body
        assert "hashed_password" not in body

    def test_register_duplicate_email_returns_409(self, client):
        payload = {"email": "dup@finwise.io", "name": "User", "password": "Pass1234"}
        client.post("/api/auth/register", json=payload)
        resp = client.post("/api/auth/register", json=payload)
        assert resp.status_code == 409
        # Our error envelope: {"error": {"code": "...", "message": "..."}}
        assert resp.json()["error"]["code"] in ("CONFLICT", "HTTP_ERROR")

    def test_register_invalid_email_returns_422(self, client):
        resp = client.post("/api/auth/register", json={
            "email": "not-an-email",
            "name": "User",
            "password": "Pass1234",
        })
        assert resp.status_code == 422
        assert resp.json()["error"]["code"] == "VALIDATION_ERROR"

    def test_register_short_password_returns_422(self, client):
        resp = client.post("/api/auth/register", json={
            "email": "short@finwise.io",
            "name": "User",
            "password": "ab",        # min_length=4 in UserCreate
        })
        assert resp.status_code == 422

    def test_register_missing_name_returns_422(self, client):
        resp = client.post("/api/auth/register", json={
            "email": "noname@finwise.io",
            "password": "Pass1234",
            # name is required
        })
        assert resp.status_code == 422


class TestLogin:
    def test_login_success_returns_token(self, client, registered_user):
        resp = client.post("/api/auth/login/json", json={
            "email": registered_user["email"],
            "password": registered_user["password"],
        })
        assert resp.status_code == 200
        body = resp.json()
        assert "access_token" in body
        assert body["token_type"] == "bearer"

    def test_login_wrong_password_returns_401(self, client, registered_user):
        resp = client.post("/api/auth/login/json", json={
            "email": registered_user["email"],
            "password": "completely_wrong",
        })
        assert resp.status_code == 401

    def test_login_unknown_email_returns_401(self, client):
        resp = client.post("/api/auth/login/json", json={
            "email": "ghost@finwise.io",
            "password": "anything",
        })
        assert resp.status_code == 401

    def test_error_response_has_our_envelope(self, client, registered_user):
        """Verify even auth errors return our consistent error shape."""
        resp = client.post("/api/auth/login/json", json={
            "email": registered_user["email"],
            "password": "wrong",
        })
        body = resp.json()
        assert "error" in body
        assert "code" in body["error"]
        assert "message" in body["error"]


class TestProtectedRoutes:
    def test_no_token_returns_401(self, client):
        resp = client.get("/api/transactions/")
        assert resp.status_code == 401

    def test_malformed_token_returns_401(self, client):
        resp = client.get(
            "/api/transactions/",
            headers={"Authorization": "Bearer this.is.garbage"},
        )
        assert resp.status_code == 401

    def test_valid_token_grants_access(self, client, auth_headers):
        resp = client.get("/api/transactions/", headers=auth_headers)
        assert resp.status_code == 200
