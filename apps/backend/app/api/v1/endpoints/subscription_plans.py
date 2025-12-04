"""
Subscription Plans API Endpoints

This module provides API endpoints for managing subscription plans and their features.
Supports both public endpoints for displaying plans and admin endpoints for management.

Public endpoints:
    - GET /api/v1/subscription-plans - List all active plans with features

Admin endpoints (require PLATFORM_ADMIN role):
    - GET /api/v1/admin/subscription-plans - List all plans (including inactive)
    - POST /api/v1/admin/subscription-plans - Create new plan
    - PUT /api/v1/admin/subscription-plans/{plan_id} - Update plan
    - DELETE /api/v1/admin/subscription-plans/{plan_id} - Soft delete plan
    - POST /api/v1/admin/subscription-plans/{plan_id}/features - Add feature to plan
    - PUT /api/v1/admin/subscription-plans/{plan_id}/features/{feature_id} - Update feature
    - DELETE /api/v1/admin/subscription-plans/{plan_id}/features/{feature_id} - Delete feature
    - PUT /api/v1/admin/subscription-plans/{plan_id}/reorder - Reorder plans

Author: Baant Lo Development Team
Created: 2025-01-27
"""

from __future__ import annotations
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from pydantic import BaseModel, Field
from datetime import datetime

from ....db.deps import get_db
from ....db.models import SubscriptionPlan, SubscriptionFeature, User
from ....auth.deps import get_current_user
from ....auth.rbac import has_permission
from ....services.audit import write_audit
from ....core.redis import get_redis_dependency
from ....core.config import settings
import json
import logging
from redis import Redis

logger = logging.getLogger(__name__)

router = APIRouter()


# Pydantic schemas for request/response
class SubscriptionFeatureBase(BaseModel):
    feature_text: str = Field(..., max_length=255, description="Feature description text")
    feature_type: str = Field(default="capability", max_length=20, description="Type of feature: limit, capability, support")
    display_order: int = Field(default=0, description="Display order within the plan")


class SubscriptionFeatureCreate(SubscriptionFeatureBase):
    pass


class SubscriptionFeatureUpdate(BaseModel):
    feature_text: Optional[str] = Field(None, max_length=255)
    feature_type: Optional[str] = Field(None, max_length=20)
    display_order: Optional[int] = None


class SubscriptionFeatureResponse(SubscriptionFeatureBase):
    id: int
    plan_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class SubscriptionPlanBase(BaseModel):
    name: str = Field(..., max_length=100, description="Plan display name")
    slug: str = Field(..., max_length=100, description="URL-friendly identifier")
    price: float = Field(..., ge=0, description="Plan price")
    currency: str = Field(default="INR", max_length=3, description="Currency code")
    billing_period: str = Field(default="month", max_length=20, description="Billing period: forever, month, year")
    description: Optional[str] = Field(None, description="Plan description")
    is_popular: bool = Field(default=False, description="Whether this plan is highlighted as popular")
    is_active: bool = Field(default=True, description="Whether this plan is available for subscription")
    display_order: int = Field(default=0, description="Display order")


class SubscriptionPlanCreate(SubscriptionPlanBase):
    features: List[SubscriptionFeatureCreate] = Field(default=[], description="Initial features for the plan")


class SubscriptionPlanUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    slug: Optional[str] = Field(None, max_length=100)
    price: Optional[float] = Field(None, ge=0)
    currency: Optional[str] = Field(None, max_length=3)
    billing_period: Optional[str] = Field(None, max_length=20)
    description: Optional[str] = None
    is_popular: Optional[bool] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None


class SubscriptionPlanResponse(SubscriptionPlanBase):
    id: int
    created_at: datetime
    updated_at: datetime
    features: List[SubscriptionFeatureResponse] = []

    class Config:
        from_attributes = True


class PlanReorderRequest(BaseModel):
    plan_ids: List[int] = Field(..., description="List of plan IDs in desired order")


# Public endpoints
@router.get("/subscription-plans", response_model=List[SubscriptionPlanResponse])
def get_subscription_plans(
    db: Session = Depends(get_db)
) -> List[SubscriptionPlanResponse]:
    """
    Get all active subscription plans with their features.
    
    This is a public endpoint that returns only active plans,
    ordered by display_order, for display on the pricing page.
    
    Optimized with eager loading to prevent N+1 queries and Redis caching.
    """
    cache_key = "subscription_plans:active"
    
    # Try to get from cache first
    try:
        r = get_redis_dependency()
        cached_data = r.get(cache_key)
        if cached_data:
            logger.info("🐌 Cache hit for subscription plans")
            return json.loads(cached_data)
        else:
            logger.info("🐌 Cache miss - no data in cache")
    except Exception as e:
        logger.warning(f"🐌 Cache read error for subscription plans: {e}")
        logger.warning(f"🐌 Error details: {str(e)}")
    
    # Cache miss or error - fetch from database
    logger.info("🐌 Fetching subscription plans from database")
    plans = (
        db.query(SubscriptionPlan)
        .options(joinedload(SubscriptionPlan.features))
        .filter(SubscriptionPlan.is_active == True)
        .order_by(SubscriptionPlan.display_order)
        .all()
    )
    
    logger.info(f"🐌 Database query returned {len(plans)} plans")
    for plan in plans:
        logger.info(f"🐌 Plan: {plan.name} - {plan.price} - Features: {len(plan.features)}")
    
    result = [
        SubscriptionPlanResponse(
            id=plan.id,
            name=plan.name,
            slug=plan.slug,
            price=float(plan.price),
            currency=plan.currency,
            billing_period=plan.billing_period,
            description=plan.description,
            is_popular=plan.is_popular,
            is_active=plan.is_active,
            display_order=plan.display_order,
            created_at=plan.created_at,
            updated_at=plan.updated_at,
            features=[
                SubscriptionFeatureResponse(
                    id=feature.id,
                    plan_id=feature.plan_id,
                    feature_text=feature.feature_text,
                    feature_type=feature.feature_type,
                    display_order=feature.display_order,
                    created_at=feature.created_at
                )
                for feature in plan.features
            ]
        )
        for plan in plans
    ]
    
    logger.info(f"🐌 Serialization completed: {len(result)} plans in result")
    if result:
        logger.info(f"🐌 First result plan: {result[0].name}")
    
    # Cache the result for 5 minutes (300 seconds)
    try:
        r = get_redis_dependency()
        # Use model_dump with mode='json' to handle datetime serialization
        r.setex(cache_key, 300, json.dumps([plan.model_dump(mode='json') for plan in result]))
        logger.info("🐌 Cached subscription plans data")
    except Exception as e:
        logger.warning(f"🐌 Cache write error for subscription plans: {e}")
    
    return result


# Admin endpoints
@router.get("/admin/subscription-plans", response_model=List[SubscriptionPlanResponse])
def admin_get_subscription_plans(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[SubscriptionPlanResponse]:
    """
    Get all subscription plans for admin management.
    
    Requires PLATFORM_ADMIN role.
    """
    if not has_permission(current_user, "admin.full_access"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions. PLATFORM_ADMIN role required."
        )
    
    query = db.query(SubscriptionPlan).options(joinedload(SubscriptionPlan.features))
    if not include_inactive:
        query = query.filter(SubscriptionPlan.is_active == True)
    
    plans = query.order_by(SubscriptionPlan.display_order).all()
    
    write_audit(
        db, 
        current_user.id, 
        "admin", 
        "subscription_plans", 
        "admin_read",
        {"include_inactive": include_inactive}
    )
    
    return [
        SubscriptionPlanResponse(
            id=plan.id,
            name=plan.name,
            slug=plan.slug,
            price=float(plan.price),
            currency=plan.currency,
            billing_period=plan.billing_period,
            description=plan.description,
            is_popular=plan.is_popular,
            is_active=plan.is_active,
            display_order=plan.display_order,
            created_at=plan.created_at,
            updated_at=plan.updated_at,
            features=[
                SubscriptionFeatureResponse(
                    id=feature.id,
                    plan_id=feature.plan_id,
                    feature_text=feature.feature_text,
                    feature_type=feature.feature_type,
                    display_order=feature.display_order,
                    created_at=feature.created_at
                )
                for feature in plan.features
            ]
        )
        for plan in plans
    ]


@router.post("/admin/subscription-plans", response_model=SubscriptionPlanResponse)
def admin_create_subscription_plan(
    plan_data: SubscriptionPlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> SubscriptionPlanResponse:
    """
    Create a new subscription plan.
    
    Requires PLATFORM_ADMIN role.
    """
    if not has_permission(current_user, "admin.full_access"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions. PLATFORM_ADMIN role required."
        )
    
    # Check if slug already exists
    existing_plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.slug == plan_data.slug).first()
    if existing_plan:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Plan with slug '{plan_data.slug}' already exists."
        )
    
    # Create the plan
    plan = SubscriptionPlan(
        name=plan_data.name,
        slug=plan_data.slug,
        price=plan_data.price,
        currency=plan_data.currency,
        billing_period=plan_data.billing_period,
        description=plan_data.description,
        is_popular=plan_data.is_popular,
        is_active=plan_data.is_active,
        display_order=plan_data.display_order
    )
    
    db.add(plan)
    db.flush()  # Get the plan ID
    
    # Add features
    for feature_data in plan_data.features:
        feature = SubscriptionFeature(
            plan_id=plan.id,
            feature_text=feature_data.feature_text,
            feature_type=feature_data.feature_type,
            display_order=feature_data.display_order
        )
        db.add(feature)
    
    db.commit()
    db.refresh(plan)
    
    # Invalidate cache after creating new plan
    try:
        r = get_redis()
        r.delete("subscription_plans:active")
        logger.info("🐌 Invalidated subscription plans cache after create")
    except Exception as e:
        logger.warning(f"🐌 Cache invalidation error: {e}")
    
    write_audit(
        db,
        current_user.id,
        "admin",
        "subscription_plans",
        "admin_create",
        {"plan_id": plan.id, "plan_name": plan.name}
    )
    
    return SubscriptionPlanResponse(
        id=plan.id,
        name=plan.name,
        slug=plan.slug,
        price=float(plan.price),
        currency=plan.currency,
        billing_period=plan.billing_period,
        description=plan.description,
        is_popular=plan.is_popular,
        is_active=plan.is_active,
        display_order=plan.display_order,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
        features=[
            SubscriptionFeatureResponse(
                id=feature.id,
                plan_id=feature.plan_id,
                feature_text=feature.feature_text,
                feature_type=feature.feature_type,
                display_order=feature.display_order,
                created_at=feature.created_at
            )
            for feature in plan.features
        ]
    )


@router.put("/admin/subscription-plans/{plan_id}", response_model=SubscriptionPlanResponse)
def admin_update_subscription_plan(
    plan_id: int,
    plan_data: SubscriptionPlanUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> SubscriptionPlanResponse:
    """
    Update an existing subscription plan.
    
    Requires PLATFORM_ADMIN role.
    """
    if not has_permission(current_user, "admin.full_access"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions. PLATFORM_ADMIN role required."
        )
    
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription plan not found."
        )
    
    # Check slug uniqueness if slug is being updated
    if plan_data.slug and plan_data.slug != plan.slug:
        existing_plan = db.query(SubscriptionPlan).filter(
            SubscriptionPlan.slug == plan_data.slug,
            SubscriptionPlan.id != plan_id
        ).first()
        if existing_plan:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Plan with slug '{plan_data.slug}' already exists."
            )
    
    # Update plan fields
    update_data = plan_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(plan, field, value)
    
    db.commit()
    db.refresh(plan)
    
    write_audit(
        db,
        current_user.id,
        "admin",
        "subscription_plans",
        "admin_update",
        {"plan_id": plan_id, "updated_fields": list(update_data.keys())}
    )
    
    return SubscriptionPlanResponse(
        id=plan.id,
        name=plan.name,
        slug=plan.slug,
        price=float(plan.price),
        currency=plan.currency,
        billing_period=plan.billing_period,
        description=plan.description,
        is_popular=plan.is_popular,
        is_active=plan.is_active,
        display_order=plan.display_order,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
        features=[
            SubscriptionFeatureResponse(
                id=feature.id,
                plan_id=feature.plan_id,
                feature_text=feature.feature_text,
                feature_type=feature.feature_type,
                display_order=feature.display_order,
                created_at=feature.created_at
            )
            for feature in plan.features
        ]
    )


@router.delete("/admin/subscription-plans/{plan_id}")
def admin_delete_subscription_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> dict:
    """
    Soft delete a subscription plan (set is_active to False).
    
    Requires PLATFORM_ADMIN role.
    """
    if not has_permission(current_user, "admin.full_access"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions. PLATFORM_ADMIN role required."
        )
    
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription plan not found."
        )
    
    plan.is_active = False
    db.commit()
    
    write_audit(
        db,
        current_user.id,
        "admin",
        "subscription_plans",
        "admin_delete",
        {"plan_id": plan_id, "plan_name": plan.name}
    )
    
    return {"message": f"Subscription plan '{plan.name}' has been deactivated."}


@router.post("/admin/subscription-plans/{plan_id}/features", response_model=SubscriptionFeatureResponse)
def admin_add_plan_feature(
    plan_id: int,
    feature_data: SubscriptionFeatureCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> SubscriptionFeatureResponse:
    """
    Add a feature to a subscription plan.
    
    Requires PLATFORM_ADMIN role.
    """
    if not has_permission(current_user, "admin.full_access"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions. PLATFORM_ADMIN role required."
        )
    
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription plan not found."
        )
    
    feature = SubscriptionFeature(
        plan_id=plan_id,
        feature_text=feature_data.feature_text,
        feature_type=feature_data.feature_type,
        display_order=feature_data.display_order
    )
    
    db.add(feature)
    db.commit()
    db.refresh(feature)
    
    write_audit(
        db,
        current_user.id,
        "admin",
        "subscription_features",
        "admin_create",
        {"plan_id": plan_id, "feature_id": feature.id, "feature_text": feature.feature_text}
    )
    
    return SubscriptionFeatureResponse(
        id=feature.id,
        plan_id=feature.plan_id,
        feature_text=feature.feature_text,
        feature_type=feature.feature_type,
        display_order=feature.display_order,
        created_at=feature.created_at
    )


@router.put("/admin/subscription-plans/{plan_id}/features/{feature_id}", response_model=SubscriptionFeatureResponse)
def admin_update_plan_feature(
    plan_id: int,
    feature_id: int,
    feature_data: SubscriptionFeatureUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> SubscriptionFeatureResponse:
    """
    Update a feature of a subscription plan.
    
    Requires PLATFORM_ADMIN role.
    """
    if not has_permission(current_user, "admin.full_access"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions. PLATFORM_ADMIN role required."
        )
    
    feature = db.query(SubscriptionFeature).filter(
        SubscriptionFeature.id == feature_id,
        SubscriptionFeature.plan_id == plan_id
    ).first()
    
    if not feature:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feature not found."
        )
    
    update_data = feature_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(feature, field, value)
    
    db.commit()
    db.refresh(feature)
    
    write_audit(
        db,
        current_user.id,
        "admin",
        "subscription_features",
        "admin_update",
        {"plan_id": plan_id, "feature_id": feature_id, "updated_fields": list(update_data.keys())}
    )
    
    return SubscriptionFeatureResponse(
        id=feature.id,
        plan_id=feature.plan_id,
        feature_text=feature.feature_text,
        feature_type=feature.feature_type,
        display_order=feature.display_order,
        created_at=feature.created_at
    )


@router.delete("/admin/subscription-plans/{plan_id}/features/{feature_id}")
def admin_delete_plan_feature(
    plan_id: int,
    feature_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> dict:
    """
    Delete a feature from a subscription plan.
    
    Requires PLATFORM_ADMIN role.
    """
    if not has_permission(current_user, "admin.full_access"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions. PLATFORM_ADMIN role required."
        )
    
    feature = db.query(SubscriptionFeature).filter(
        SubscriptionFeature.id == feature_id,
        SubscriptionFeature.plan_id == plan_id
    ).first()
    
    if not feature:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feature not found."
        )
    
    feature_text = feature.feature_text
    db.delete(feature)
    db.commit()
    
    write_audit(
        db,
        current_user.id,
        "admin",
        "subscription_features",
        "admin_delete",
        {"plan_id": plan_id, "feature_id": feature_id, "feature_text": feature_text}
    )
    
    return {"message": f"Feature '{feature_text}' has been deleted."}


@router.put("/admin/subscription-plans/reorder")
def admin_reorder_plans(
    reorder_data: PlanReorderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> dict:
    """
    Reorder subscription plans by updating their display_order.
    
    Requires PLATFORM_ADMIN role.
    """
    if not has_permission(current_user, "admin.full_access"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions. PLATFORM_ADMIN role required."
        )
    
    # Update display_order for each plan
    for order, plan_id in enumerate(reorder_data.plan_ids, 1):
        plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == plan_id).first()
        if plan:
            plan.display_order = order
    
    db.commit()
    
    write_audit(
        db,
        current_user.id,
        "admin",
        "subscription_plans",
        "admin_reorder",
        {"plan_ids": reorder_data.plan_ids}
    )
    
    return {"message": "Subscription plans have been reordered successfully."}
