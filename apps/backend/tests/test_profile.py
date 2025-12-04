def test_profile_shape():
  from app.db.models import User
  u = User(id='u1', email='u1@test', hashed_password='x')
  assert u.preferred_currency == 'INR'

