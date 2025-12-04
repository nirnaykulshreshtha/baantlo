"""
Integration test: login with provided credentials and fetch dashboard stats.

This test exercises the auth flow (register/login) and the optimized
`/api/v1/dashboard/stats` endpoint to ensure authenticated access works.

Aggressive logging is used to aid debugging if failures occur.
"""

from fastapi.testclient import TestClient
from app.main import app


def _extract_access_token(body: dict) -> str | None:
    # Support both direct and session-wrapped formats
    if not isinstance(body, dict):
        return None
    if body.get("access_token"):
        return body.get("access_token")
    session = body.get("session") or {}
    return session.get("access_token")


def test_login_and_fetch_dashboard_stats_with_given_credentials():
    client = TestClient(app)

    email = "nirnay@bucle.dev"
    password = "Test@123"

    # Attempt registration (idempotent for test purposes)
    r = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password},
    )
    print("[test] register status=", r.status_code, "body=", r.text[:300])
    assert r.status_code in (200, 201, 400, 409)

    # Login
    r = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    print("[test] login status=", r.status_code, "body=", r.text[:300])
    assert r.status_code == 200
    access_token = _extract_access_token(r.json())
    assert access_token, "access_token missing in login response"

    headers = {"Authorization": f"Bearer {access_token}"}

    # Fetch dashboard stats
    r = client.get("/api/v1/dashboard/stats", headers=headers)
    print("[test] stats status=", r.status_code, "body=", r.text[:300])
    assert r.status_code == 200

    data = r.json()
    # Basic shape assertions
    for key in [
        "total_groups",
        "total_expenses",
        "total_settlements",
        "pending_settlements",
        "user_balance",
        "recent_activity",
    ]:
        assert key in data, f"missing key in stats: {key}"


