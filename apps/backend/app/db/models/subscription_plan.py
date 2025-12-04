"""
Subscription Plan Database Models

This module defines the database models for managing subscription plans and their features.
Platform admins can create, update, and manage subscription plans dynamically through the admin interface.

Models:
    - SubscriptionPlan: Represents a subscription tier (e.g., Free, Pro, Enterprise)
    - SubscriptionFeature: Represents individual features within a subscription plan

Author: Baant Lo Development Team
Created: 2025-01-27
"""

from __future__ import annotations
from sqlalchemy import String, Numeric, Boolean, Integer, Text, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from datetime import datetime
from ..base import Base


class SubscriptionPlan(Base):
    """
    Subscription Plan Model
    
    Represents a subscription tier that users can subscribe to.
    Platform admins can create and manage these plans through the admin interface.
    
    Attributes:
        id: Unique identifier for the plan
        name: Display name of the plan (e.g., "Flatmates", "Friends & Trips")
        slug: URL-friendly identifier (e.g., "flatmates", "friends-trips")
        price: Price of the plan in the smallest currency unit (e.g., 299 for ₹299)
        currency: Currency code (default: "INR")
        billing_period: Billing cycle ("forever", "month", "year")
        description: Marketing description of the plan
        is_popular: Whether this plan should be highlighted as "Most Popular"
        is_active: Whether this plan is currently available for subscription
        display_order: Order in which plans should be displayed (lower = earlier)
        created_at: Timestamp when the plan was created
        updated_at: Timestamp when the plan was last modified
        features: Related subscription features
    """
    __tablename__ = "subscription_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="INR")
    billing_period: Mapped[str] = mapped_column(String(20), nullable=False, default="month")
    description: Mapped[str] = mapped_column(Text, nullable=True)
    is_popular: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    features: Mapped[list["SubscriptionFeature"]] = relationship(
        "SubscriptionFeature",
        back_populates="plan",
        cascade="all, delete-orphan",
        order_by="SubscriptionFeature.display_order"
    )


class SubscriptionFeature(Base):
    """
    Subscription Feature Model
    
    Represents an individual feature or capability included in a subscription plan.
    Features are displayed as bullet points in the pricing page.
    
    Attributes:
        id: Unique identifier for the feature
        plan_id: Foreign key to the parent subscription plan
        feature_text: The text describing the feature (e.g., "Up to 3 groups")
        feature_type: Category of feature ("limit", "capability", "support")
        display_order: Order in which features should be displayed within the plan
        created_at: Timestamp when the feature was created
        plan: Related subscription plan
    """
    __tablename__ = "subscription_features"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    plan_id: Mapped[int] = mapped_column(Integer, ForeignKey("subscription_plans.id"), nullable=False)
    feature_text: Mapped[str] = mapped_column(String(255), nullable=False)
    feature_type: Mapped[str] = mapped_column(String(20), nullable=False, default="capability")
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    plan: Mapped["SubscriptionPlan"] = relationship("SubscriptionPlan", back_populates="features")

