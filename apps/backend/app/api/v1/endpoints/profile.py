from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ....db.deps import get_db
from ....db.models import User, RefreshToken
from ....auth.deps import get_current_user
from ....core.minio import get_minio
from ....core.config import settings
from ....core.security import verify_password, hash_password
from ..schemas import ProfileUpdateRequest, ChangePasswordRequest


router = APIRouter()


@router.get("")
def get_profile(current_user: User = Depends(get_current_user)) -> dict:
    client = get_minio()
    bucket = settings.minio_bucket
    avatar_url = None
    if current_user.avatar_key:
        try:
            avatar_url = client.get_presigned_url("GET", bucket, current_user.avatar_key)
        except Exception:
            avatar_url = None

    verified = bool(getattr(current_user, "email_verified", False)) or bool(getattr(current_user, "phone_verified", False))

    return {
        "id": current_user.id,
        "email": current_user.email,
        "display_name": current_user.display_name,
        "avatar_key": current_user.avatar_key,
        "avatar_url": avatar_url,
        "language": current_user.language,
        "notifications_enabled": current_user.notifications_enabled,
        "preferred_currency": current_user.preferred_currency,
        "created_at": getattr(current_user, "created_at", None),
        "last_login_at": getattr(current_user, "last_login_at", None),
        "verified": verified,
    }


@router.put("")
def update_profile(
    body: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    if body.display_name is not None:
        current_user.display_name = body.display_name
    if body.preferred_currency is not None:
        current_user.preferred_currency = body.preferred_currency
    if body.language is not None:
        current_user.language = body.language
    if body.notifications_enabled is not None:
        current_user.notifications_enabled = body.notifications_enabled
    db.add(current_user)
    db.commit()
    return get_profile(current_user)


@router.post("/avatar/upload-url")
def get_avatar_upload_url(current_user: User = Depends(get_current_user)) -> dict:
    client = get_minio()
    bucket = settings.minio_bucket
    object_name = f"avatars/{current_user.id}.png"
    try:
        url = client.get_presigned_url("PUT", bucket, object_name)
    except Exception:
        raise HTTPException(status_code=502, detail={"error": "storage_unavailable"})
    return {"upload_url": url, "key": object_name}


@router.post("/change-password")
def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"error": "invalid_current_password"})
    if body.current_password == body.new_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"error": "password_unchanged"})
    current_user.hashed_password = hash_password(body.new_password)
    db.add(current_user)
    tokens = db.query(RefreshToken).filter(RefreshToken.user_id == current_user.id, RefreshToken.revoked == False).all()
    for t in tokens:
        t.revoked = True
        db.add(t)
    db.commit()
    return {"changed": True}
