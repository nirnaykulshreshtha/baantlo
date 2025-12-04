from datetime import timedelta
from app.auth.tokens import create_access_token, create_refresh_token, decode_token
from app.core.config import settings


def test_access_token_contains_claims():
  token = create_access_token({"sub": "u1", "roles": ["BASIC_USER"], "permissions": []})
  payload = decode_token(token)
  assert payload["sub"] == "u1"
  assert payload["type"] == "access"


def test_refresh_token_roundtrip():
  token, jti, exp = create_refresh_token("u1", minutes=1)
  payload = decode_token(token)
  assert payload["sub"] == "u1"
  assert payload["jti"] == jti
  assert payload["type"] == "refresh"

