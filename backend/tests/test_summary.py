# tests/test_summary.py
#
# The summary endpoint aggregates transactions — so these tests need to
# create real transactions first, then verify the math is correct.
# Field names match SummaryResponse exactly: total_income, total_expenses, net_savings.

SALARY = {"amount": "3000.00", "type": "income",  "category": "Salary",    "description": "Salary",    "date": "2024-03-01"}
RENT   = {"amount": "1200.00", "type": "expense", "category": "Housing",   "description": "Rent",      "date": "2024-03-05"}
FOOD   = {"amount": "300.00",  "type": "expense", "category": "Food",      "description": "Groceries", "date": "2024-03-10"}


class TestSummary:
    def test_summary_requires_auth(self, client):
        resp = client.get("/api/summary/?month=2024-03")
        assert resp.status_code == 401

    def test_summary_empty_month_returns_zeros(self, client, auth_headers):
        """No transactions in 2099-01 — all totals must be zero, not null."""
        resp = client.get("/api/summary/?month=2099-01", headers=auth_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert float(body["total_income"]) == 0
        assert float(body["total_expenses"]) == 0
        assert float(body["net_savings"]) == 0
        assert body["by_category"] == []

    def test_summary_income_math(self, client, auth_headers):
        client.post("/api/transactions/", json=SALARY, headers=auth_headers)
        resp = client.get("/api/summary/?month=2024-03", headers=auth_headers)
        assert float(resp.json()["total_income"]) == 3000.00

    def test_summary_expense_math(self, client, auth_headers):
        client.post("/api/transactions/", json=RENT, headers=auth_headers)
        client.post("/api/transactions/", json=FOOD, headers=auth_headers)
        resp = client.get("/api/summary/?month=2024-03", headers=auth_headers)
        assert float(resp.json()["total_expenses"]) == 1500.00

    def test_summary_net_savings_math(self, client, auth_headers):
        """net_savings = total_income - total_expenses"""
        client.post("/api/transactions/", json=SALARY, headers=auth_headers)
        client.post("/api/transactions/", json=RENT, headers=auth_headers)
        client.post("/api/transactions/", json=FOOD, headers=auth_headers)

        resp = client.get("/api/summary/?month=2024-03", headers=auth_headers)
        body = resp.json()

        assert float(body["total_income"])   == 3000.00
        assert float(body["total_expenses"]) == 1500.00
        assert float(body["net_savings"])    == 1500.00   # 3000 - 1500

    def test_summary_by_category(self, client, auth_headers):
        client.post("/api/transactions/", json=RENT, headers=auth_headers)
        client.post("/api/transactions/", json=FOOD, headers=auth_headers)

        resp = client.get("/api/summary/?month=2024-03", headers=auth_headers)
        categories = {c["category"]: float(c["total"]) for c in resp.json()["by_category"]}

        assert categories["Housing"] == 1200.00
        assert categories["Food"]    == 300.00

    def test_summary_month_isolation(self, client, auth_headers):
        """Transactions in April must not pollute the March summary."""
        client.post("/api/transactions/", json=SALARY, headers=auth_headers)                         # March
        client.post("/api/transactions/", json={**RENT, "date": "2024-04-01"}, headers=auth_headers)  # April

        resp = client.get("/api/summary/?month=2024-03", headers=auth_headers)
        # Only the salary should count
        assert float(resp.json()["total_income"]) == 3000.00
        assert float(resp.json()["total_expenses"]) == 0.00

    def test_summary_only_counts_current_user(self, client, auth_headers):
        """Another user's transactions must not appear in your summary."""
        # Register + login as a second user
        client.post("/api/auth/register", json={
            "email": "other@finwise.io", "name": "Other", "password": "Pass1234"
        })
        other = client.post("/api/auth/login/json", json={
            "email": "other@finwise.io", "password": "Pass1234"
        })
        other_headers = {"Authorization": f"Bearer {other.json()['access_token']}"}

        # Other user creates a big transaction
        client.post("/api/transactions/", json={**SALARY, "amount": "99999.00"}, headers=other_headers)

        # Our user's summary should still be zero
        resp = client.get("/api/summary/?month=2024-03", headers=auth_headers)
        assert float(resp.json()["total_income"]) == 0.00

    def test_summary_missing_month_returns_422(self, client, auth_headers):
        """month is a required query param."""
        resp = client.get("/api/summary/", headers=auth_headers)
        assert resp.status_code == 422
