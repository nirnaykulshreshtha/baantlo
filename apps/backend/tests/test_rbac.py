from app.auth.rbac import has_permission


class U:
  def __init__(self, id, role):
    self.id = id
    self.role = role


class R:
  def __init__(self, owner_id):
    self.owner_id = owner_id


def test_admin_has_all():
  u = U("1", "PLATFORM_ADMIN")
  assert has_permission(u, "group.update.any")


def test_owner_checks():
  u = U("1", "BASIC_USER")
  r = R("1")
  assert has_permission(u, "group.update.own", r)
  assert not has_permission(u, "group.update.any", r)

