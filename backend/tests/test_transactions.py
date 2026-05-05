# tests/test_transactions.py
#
# Covers: create, list (with filters), update, delete.
# Each class groups related tests — same as grouping by HTTP method.
# All tests rely on `auth_headers` from conftest.py.

VALID_TX = {
    "amount": "42.50",
    "type": "expense",
    "category": "Food",
    "description": "Weekly groceries",
    "date": "2024-03-15",
}

INCOME_TX = {
    "amount": "3000.00",
    "type": "income",
    "category": "Salary",
    "description": "March salary",
    "date": "2024-03-01",
}


class TestCreateTransaction:
    def test_create_returns_201(self, client, auth_headers):
        resp = client.post("/api/transactions/", json=VALID_TX, headers=auth_headers)
        assert resp.status_code == 201

    def test_create_returns_correct_fields(self, client, auth_headers):
        resp = client.post("/api/transactions/", json=VALID_TX, headers=auth_headers)
        body = resp.json()
        assert float(body["amount"]) == 42.50
        assert body["category"] == "Food"
        assert body["type"] == "expense"
        assert "id" in body
        assert "user_id" in body

    def test_create_negative_amount_returns_422(self, client, auth_headers):
        resp = client.post(
            "/api/transactions/",
            json={**VALID_TX, "amount": "-10.00"},
            headers=auth_headers,
        )
        assert resp.status_code == 422
        assert resp.json()["error"]["code"] == "VALIDATION_ERROR"

    def test_create_zero_amount_returns_422(self, client, auth_headers):
        resp = client.post(
            "/api/transactions/",
            json={**VALID_TX, "amount": "0"},
            headers=auth_headers,
        )
        assert resp.status_code == 422

    def test_create_invalid_type_returns_422(self, client, auth_headers):
        resp = client.post(
            "/api/transactions/",
            json={**VALID_TX, "type": "banana"},
            headers=auth_headers,
        )
        assert resp.status_code == 422

    def test_create_requires_auth(self, client):
        resp = client.post("/api/transactions/", json=VALID_TX)
        assert resp.status_code == 401


class TestListTransactions:
    def test_list_returns_200(self, client, auth_headers):
        resp = client.get("/api/transactions/", headers=auth_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_list_empty_when_no_transactions(self, client, auth_headers):
        resp = client.get("/api/transactions/", headers=auth_headers)
        assert resp.json() == []

    def test_list_contains_created_transaction(self, client, auth_headers):
        client.post("/api/transactions/", json=VALID_TX, headers=auth_headers)
        resp = client.get("/api/transactions/", headers=auth_headers)
        assert len(resp.json()) == 1
        assert resp.json()[0]["category"] == "Food"

    def test_filter_by_type_income(self, client, auth_headers):
        client.post("/api/transactions/", json=VALID_TX, headers=auth_headers)    # expense
        client.post("/api/transactions/", json=INCOME_TX, headers=auth_headers)  # income
        resp = client.get("/api/transactions/?type=income", headers=auth_headers)
        assert resp.status_code == 200
        assert all(tx["type"] == "income" for tx in resp.json())

    def test_filter_by_type_expense(self, client, auth_headers):
        client.post("/api/transactions/", json=VALID_TX, headers=auth_headers)
        client.post("/api/transactions/", json=INCOME_TX, headers=auth_headers)
        resp = client.get("/api/transactions/?type=expense", headers=auth_headers)
        assert all(tx["type"] == "expense" for tx in resp.json())

    def test_filter_by_month(self, client, auth_headers):
        client.post("/api/transactions/", json=VALID_TX, headers=auth_headers)    # 2024-03
        client.post("/api/transactions/", json={**VALID_TX, "date": "2024-04-10"}, headers=auth_headers)
        resp = client.get("/api/transactions/?month=2024-03", headers=auth_headers)
        assert len(resp.json()) == 1
        assert resp.json()[0]["date"] == "2024-03-15"

    def test_list_does_not_return_other_users_transactions(self, client, auth_headers):
        # Create a second user and their transaction
        client.post("/api/auth/register", json={
            "email": "other@finwise.io", "name": "Other", "password": "Pass1234"
        })
        other_login = client.post("/api/auth/login/json", json={
            "email": "other@finwise.io", "password": "Pass1234"
        })
        other_headers = {"Authorization": f"Bearer {other_login.json()['access_token']}"}
        client.post("/api/transactions/", json=INCOME_TX, headers=other_headers)

        # Original user should see zero transactions
        resp = client.get("/api/transactions/", headers=auth_headers)
        assert resp.json() == []

    def test_list_requires_auth(self, client):
        resp = client.get("/api/transactions/")
        assert resp.status_code == 401


class TestUpdateTransaction:
    def _create(self, client, auth_headers, data=None):
        """Helper: create one transaction and return its ID."""
        resp = client.post("/api/transactions/", json=data or VALID_TX, headers=auth_headers)
        return resp.json()["id"]

    def test_update_returns_200(self, client, auth_headers):
        tx_id = self._create(client, auth_headers)
        resp = client.put(
            f"/api/transactions/{tx_id}",
            json={**VALID_TX, "amount": "99.99"},
            headers=auth_headers,
        )
        assert resp.status_code == 200

    def test_update_changes_amount(self, client, auth_headers):
        tx_id = self._create(client, auth_headers)
        client.put(f"/api/transactions/{tx_id}", json={**VALID_TX, "amount": "99.99"}, headers=auth_headers)
        resp = client.get("/api/transactions/", headers=auth_headers)
        assert float(resp.json()[0]["amount"]) == 99.99

    def test_update_nonexistent_returns_404(self, client, auth_headers):
        resp = client.put(
            "/api/transactions/00000000-0000-0000-0000-000000000000",
            json=VALID_TX,
            headers=auth_headers,
        )
        assert resp.status_code == 404
        assert resp.json()["error"]["code"] == "NOT_FOUND"

    def test_update_requires_auth(self, client):
        resp = client.put("/api/transactions/some-id", json=VALID_TX)
        assert resp.status_code == 401


class TestDeleteTransaction:
    def _create(self, client, auth_headers):
        resp = client.post("/api/transactions/", json=VALID_TX, headers=auth_headers)
        return resp.json()["id"]

    def test_delete_returns_204(self, client, auth_headers):
        tx_id = self._create(client, auth_headers)
        resp = client.delete(f"/api/transactions/{tx_id}", headers=auth_headers)
        assert resp.status_code == 204

    def test_delete_actually_removes_transaction(self, client, auth_headers):
        tx_id = self._create(client, auth_headers)
        client.delete(f"/api/transactions/{tx_id}", headers=auth_headers)
        resp = client.get("/api/transactions/", headers=auth_headers)
        assert resp.json() == []

    def test_delete_nonexistent_returns_404(self, client, auth_headers):
        resp = client.delete(
            "/api/transactions/00000000-0000-0000-0000-000000000000",
            headers=auth_headers,
        )
        assert resp.status_code == 404
        assert resp.json()["error"]["code"] == "NOT_FOUND"

    def test_delete_requires_auth(self, client):
        resp = client.delete("/api/transactions/some-id")
        assert resp.status_code == 401
