from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ....db.deps import get_db
from ....db.models import User
from ....auth.deps import get_current_user
from ....auth.rbac import has_permission, get_platform_permissions_for_roles


router = APIRouter()


@router.get("/me")
def read_me(current_user: User = Depends(get_current_user)) -> dict:
    perms = list(get_platform_permissions_for_roles([current_user.role]) if current_user.role else [])
    return {"id": current_user.id, "email": current_user.email, "roles": [current_user.role], "permissions": perms}


@router.get("/{user_id}")
def read_user(user_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    target = db.get(User, user_id)
    if not target:
        return {}
    if current_user.id == target.id or has_permission(current_user, "user.read.any"):
        perms = list(get_platform_permissions_for_roles([target.role]) if target.role else [])
        return {"id": target.id, "email": target.email, "roles": [target.role], "permissions": perms}
    return {"error": "forbidden"}

