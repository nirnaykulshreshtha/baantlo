from app.core.security import verify_password


def test_hash_and_verify():
  from app.core.security import hash_password
  h = hash_password("secret")
  assert verify_password("secret", h)

