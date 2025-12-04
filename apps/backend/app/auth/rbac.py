import json
import pathlib
from typing import Any, Callable, Iterable, Optional
from sqlalchemy.orm import Session


_MANIFEST_PATH = pathlib.Path(__file__).with_name("permissions.json")


with _MANIFEST_PATH.open("r", encoding="utf-8") as f:
    _manifest = json.load(f)


PLATFORM_PERMISSIONS: set[str] = set(_manifest["platform_permissions"]) if "platform_permissions" in _manifest else set()
GROUP_PERMISSIONS: set[str] = set(_manifest["group_permissions"]) if "group_permissions" in _manifest else set()
PLATFORM_ROLE_TO_PERMISSIONS: dict[str, list[str]] = _manifest.get("platform_roles", {})
GROUP_ROLE_TO_PERMISSIONS: dict[str, list[str]] = _manifest.get("group_roles", {})


def get_platform_permissions_for_roles(roles: Iterable[str]) -> set[str]:
    result: set[str] = set()
    for role in roles:
        result.update(PLATFORM_ROLE_TO_PERMISSIONS.get(role, []))
    return result


def get_group_permissions_for_roles(roles: Iterable[str]) -> set[str]:
    result: set[str] = set()
    for role in roles:
        result.update(GROUP_ROLE_TO_PERMISSIONS.get(role, []))
    return result


def has_platform_permission(user: Any, permission: str, resource: Any | None = None) -> bool:
    if permission == "admin.full_access" and hasattr(user, "role") and str(user.role) == "PLATFORM_ADMIN":
        return True
    
    if not hasattr(user, "role") or not user.role:
        return False
    
    platform_roles = [str(user.role)]
    effective_permissions = get_platform_permissions_for_roles(platform_roles)
    
    if permission in effective_permissions:
        return True
    
    if permission.endswith(".own") and resource is not None:
        owner_id = getattr(resource, "owner_id", None) or getattr(resource, "user_id", None)
        user_id = getattr(user, "id", None)
        return owner_id is not None and user_id is not None and str(owner_id) == str(user_id)
    
    return False


def has_group_permission(user: Any, permission: str, group_id: str, db: Session) -> bool:
    from ..db.models import GroupMember
    
    if not hasattr(user, "id") or not user.id:
        return False
    
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user.id,
        GroupMember.status == "active"
    ).first()
    
    if not membership:
        return False
    
    group_roles = [membership.role]
    effective_permissions = get_group_permissions_for_roles(group_roles)
    
    if permission in effective_permissions:
        return True
    
    if permission.endswith(".own") and hasattr(user, "id"):
        return True
    
    return False


def has_permission(user: Any, permission: str, resource: Any | None = None, group_id: str | None = None, db: Session | None = None) -> bool:
    if permission in PLATFORM_PERMISSIONS:
        return has_platform_permission(user, permission, resource)
    elif permission in GROUP_PERMISSIONS:
        if group_id and db:
            return has_group_permission(user, permission, group_id, db)
        else:
            return False
    else:
        return False


def require_permissions(permissions: list[str], resource_getter: Callable[[dict[str, Any]], Any] | None = None, group_id_getter: Callable[[dict[str, Any]], str] | None = None) -> Callable[[Any, dict[str, Any]], None]:
    from fastapi import HTTPException, status, Depends
    from ..db.deps import get_db

    def dependency(user: Any = None, request_state: dict[str, Any] | None = None, db: Session = Depends(get_db)) -> None:
        res = None
        group_id = None
        
        if resource_getter is not None and request_state is not None:
            res = resource_getter(request_state)
        
        if group_id_getter is not None and request_state is not None:
            group_id = group_id_getter(request_state)
        
        for perm in permissions:
            if not has_permission(user, perm, res, group_id, db):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")

    return dependency

