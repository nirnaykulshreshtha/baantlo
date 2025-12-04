from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Tuple
from decimal import Decimal
from datetime import datetime
import uuid
import mimetypes

from ....db.deps import get_db
from ....db.models import Expense, ExpenseSplit, Group, GroupMember, User
from ....auth.deps import get_current_user
from ....auth.rbac import has_permission
from ....services.audit import write_audit
from ....services.sync import append_sync
from ....services.currency import convert_to_inr
from ....services.balance import calculate_group_balances, invalidate_group_balance_cache
from ....services.cache_invalidation import invalidate_user_caches_for_group
from ....core.minio import get_minio
from ....core.config import settings
from ....utils.ids import generate_token_128b
from ..schemas import (
    ExpenseCreateRequest, 
    ExpenseUpdateRequest, 
    ExpenseResponse,
    ExpenseSplitRequest
)
from ..errors import FORBIDDEN, USER_NOT_MEMBER

router = APIRouter()


def _validate_group_membership(group_id: str, user_id: str, db: Session) -> Group:
    """Validate that user is a member of the group."""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id,
        GroupMember.status == "active"
    ).first()
    
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=USER_NOT_MEMBER)
    
    return group


def _validate_split_users(group_id: str, splits: List[ExpenseSplitRequest], db: Session) -> None:
    """Validate that all split users are group members."""
    split_user_ids = {split.user_id for split in splits}
    
    memberships = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id.in_(split_user_ids),
        GroupMember.status == "active"
    ).all()
    
    member_user_ids = {m.user_id for m in memberships}
    invalid_users = split_user_ids - member_user_ids
    
    if invalid_users:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Users {list(invalid_users)} are not group members"
        )


def _calculate_splits(amount: Decimal, splits: List[ExpenseSplitRequest], currency: str) -> List[Tuple[str, Decimal, Decimal]]:
    """Calculate split amounts and validate totals."""
    amount_inr = convert_to_inr(amount, currency)
    
    # Check if it's percentage-based or amount-based
    has_percentages = any(split.percentage is not None for split in splits)
    has_amounts = any(split.amount is not None for split in splits)
    
    if has_percentages and has_amounts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot mix percentage and amount-based splits"
        )
    
    if has_percentages:
        # Percentage-based splits
        total_percentage = sum(split.percentage or 0 for split in splits)
        if abs(total_percentage - 100) > Decimal("0.01"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Split percentages must total 100%"
            )
        
        result = []
        for split in splits:
            split_amount = (amount * (split.percentage or 0)) / 100
            split_amount_inr = convert_to_inr(split_amount, currency)
            result.append((split.user_id, split_amount, split_amount_inr))
    elif has_amounts:
        # Amount-based splits
        total_amount = sum(split.amount or 0 for split in splits)
        if abs(total_amount - amount) > Decimal("0.01"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Split amounts must total the expense amount"
            )
        
        result = []
        for split in splits:
            split_amount = split.amount or 0
            split_amount_inr = convert_to_inr(split_amount, currency)
            result.append((split.user_id, split_amount, split_amount_inr))
    else:
        # Equal splits - when neither amount nor percentage is specified
        num_splits = len(splits)
        if num_splits == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one split is required"
            )
        
        equal_amount = amount / num_splits
        result = []
        for split in splits:
            split_amount_inr = convert_to_inr(equal_amount, currency)
            result.append((split.user_id, equal_amount, split_amount_inr))
    
    return result


@router.post("", response_model=ExpenseResponse)
def create_expense(
    body: ExpenseCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """Create a new expense."""
    if not has_permission(current_user, "expense.create", group_id=body.group_id, db=db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=FORBIDDEN)
    
    # Validate group membership
    group = _validate_group_membership(body.group_id, current_user.id, db)
    
    # Validate split users
    _validate_split_users(body.group_id, body.splits, db)
    
    # Calculate splits
    split_calculations = _calculate_splits(body.amount, body.splits, body.currency)
    
    # Create expense
    expense = Expense(
        group_id=body.group_id,
        payer_id=body.payer_id,
        amount=body.amount,
        currency=body.currency,
        amount_inr=convert_to_inr(body.amount, body.currency),
        description=body.description,
        expense_date=body.expense_date,
        receipt_key=body.receipt_file,
        created_by=current_user.id
    )
    
    db.add(expense)
    db.flush()  # Get the expense ID
    
    # Create splits
    for user_id, split_amount, split_amount_inr in split_calculations:
        split = ExpenseSplit(
            expense_id=expense.id,
            user_id=user_id,
            amount=split_amount,
            amount_inr=split_amount_inr,
            percentage=next((s.percentage for s in body.splits if s.user_id == user_id), None)
        )
        db.add(split)
    
    # Flush to ensure splits are available for querying
    db.flush()
    
    # Get payer name
    payer = db.query(User).filter(User.id == body.payer_id).first()
    payer_name = payer.display_name or payer.email if payer else "Unknown"
    
    # Get split details
    split_details = []
    for split in expense.splits:
        user = db.query(User).filter(User.id == split.user_id).first()
        user_name = user.display_name or user.email if user else "Unknown"
        split_details.append({
            "user_id": split.user_id,
            "user_name": user_name,
            "amount": split.amount,
            "amount_inr": split.amount_inr,
            "percentage": split.percentage
        })
    
    # Write audit log
    write_audit(
        db=db,
        actor_user_id=current_user.id,
        entity_type="expense",
        entity_id=expense.id,
        action="create",
        metadata={"group_id": body.group_id, "amount": str(body.amount), "currency": body.currency}
    )
    
    # Append sync operation for all group members
    from ....db.models import GroupMember
    members = db.query(GroupMember).filter(GroupMember.group_id == body.group_id, GroupMember.status == "active").all()
    for member in members:
        append_sync(
            db=db,
            user_id=member.user_id,
            op_type="create",
            entity_type="expense",
            entity_id=expense.id,
            payload={
                "group_id": body.group_id,
                "group_name": group.name,
                "payer_id": body.payer_id,
                "payer_name": payer_name,
                "amount": str(body.amount),
                "currency": body.currency,
                "description": body.description,
                "expense_date": body.expense_date.isoformat(),
                "splits": [{"user_id": s.user_id, "amount": str(s.amount), "percentage": str(s.percentage) if s.percentage else None} for s in body.splits]
            }
        )
    
    db.commit()
    
    # Invalidate balance cache
    invalidate_group_balance_cache(body.group_id)
    # Invalidate user aggregates for the group
    invalidate_user_caches_for_group(db, body.group_id)
    
    return ExpenseResponse(
        id=expense.id,
        group_id=body.group_id,
        payer_id=body.payer_id,
        payer_name=payer_name,
        amount=body.amount,
        currency=body.currency,
        amount_inr=expense.amount_inr,
        description=body.description,
        expense_date=body.expense_date,
        receipt_key=body.receipt_file,
        created_by=current_user.id,
        created_at=expense.created_at,
        splits=split_details
    )


@router.get("")
def list_expenses(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    # New optional query parameters for filtering
    start_date: datetime = Query(None, description="Filter expenses from this date (inclusive)"),
    end_date: datetime = Query(None, description="Filter expenses until this date (inclusive)"),
    min_amount: Decimal = Query(None, ge=0, description="Filter expenses with amount greater than or equal to this value"),
    max_amount: Decimal = Query(None, ge=0, description="Filter expenses with amount less than or equal to this value"),
    payer_id: str = Query(None, description="Filter expenses by payer user ID"),
    group_id: str = Query(None, description="Filter expenses by group ID")
) -> dict:
    """List expenses for the current user across all groups."""
    # Get all groups where user is a member (optimized query)
    memberships = db.query(GroupMember).filter(
        GroupMember.user_id == current_user.id,
        GroupMember.status == "active"
    ).all()
    
    if not memberships:
        return {
            "items": [],
            "total": 0,
            "total_filtered_amount": Decimal("0.00"), # New field
            "page": page,
            "page_size": page_size,
            "total_pages": 0
        }
    
    group_ids = [membership.group_id for membership in memberships]
    
    # Optimized query with eager loading to prevent N+1 queries
    query = db.query(Expense).filter(
        Expense.group_id.in_(group_ids),
        Expense.deleted_at.is_(None)
    ).options(
        joinedload(Expense.splits).joinedload(ExpenseSplit.user),
        joinedload(Expense.payer)
    )
    
    # Apply filters
    if start_date:
        query = query.filter(Expense.expense_date >= start_date.date()) # Convert datetime to date
    if end_date:
        query = query.filter(Expense.expense_date <= end_date.date()) # Convert datetime to date
    if min_amount:
        query = query.filter(Expense.amount_inr >= min_amount)
    if max_amount:
        query = query.filter(Expense.amount_inr <= max_amount)
    if payer_id:
        query = query.filter(Expense.payer_id == payer_id)
    if group_id:
        query = query.filter(Expense.group_id == group_id)
    
    # Calculate total filtered amount before pagination (optimized)
    total_filtered_amount_query = query.with_entities(func.sum(Expense.amount_inr))
    total_filtered_amount = total_filtered_amount_query.scalar() or Decimal("0.00")
    
    # Get total count and paginated results
    total = query.count()
    expenses = query.order_by(Expense.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    # Format response (optimized - no additional queries needed due to eager loading)
    expense_list = []
    for expense in expenses:
        # Payer data is already loaded via joinedload
        payer_name = expense.payer.display_name or expense.payer.email if expense.payer else "Unknown"
        
        split_details = []
        for split in expense.splits:
            # User data is already loaded via joinedload
            user_name = split.user.display_name or split.user.email if split.user else "Unknown"
            split_details.append({
                "user_id": split.user_id,
                "user_name": user_name,
                "amount": split.amount,
                "amount_inr": split.amount_inr,
                "percentage": split.percentage
            })
        
        expense_list.append({
            "id": expense.id,
            "group_id": expense.group_id,
            "payer_id": expense.payer_id,
            "payer_name": payer_name,
            "amount": expense.amount,
            "currency": expense.currency,
            "amount_inr": expense.amount_inr,
            "description": expense.description,
            "expense_date": expense.expense_date,
            "receipt_key": expense.receipt_key,
            "created_by": expense.created_by,
            "created_at": expense.created_at,
            "splits": split_details
        })
    
    return {
        "items": expense_list,
        "total": total,
        "total_filtered_amount": total_filtered_amount, # New field
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }


@router.get("/group/{group_id}")
def list_group_expenses(
    group_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    start_date: datetime = Query(None, description="Filter expenses from this date (inclusive)"),
    end_date: datetime = Query(None, description="Filter expenses until this date (inclusive)"),
    min_amount: Decimal = Query(None, ge=0, description="Filter expenses with amount greater than or equal to this value"),
    max_amount: Decimal = Query(None, ge=0, description="Filter expenses with amount less than or equal to this value"),
    payer_id: str = Query(None, description="Filter expenses by payer user ID")
) -> dict:
    """List expenses for a group."""
    if not has_permission(current_user, "expense.read.group", group_id=group_id, db=db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=FORBIDDEN)
    
    # Validate group membership
    _validate_group_membership(group_id, current_user.id, db)
    
    # Query expenses with eager loading to prevent N+1 queries
    query = db.query(Expense).filter(
        Expense.group_id == group_id,
        Expense.deleted_at.is_(None)
    ).options(
        joinedload(Expense.splits).joinedload(ExpenseSplit.user),
        joinedload(Expense.payer)
    )
    
    # Apply filters
    if start_date:
        query = query.filter(Expense.expense_date >= start_date.date())
    if end_date:
        query = query.filter(Expense.expense_date <= end_date.date())
    if min_amount:
        query = query.filter(Expense.amount_inr >= min_amount)
    if max_amount:
        query = query.filter(Expense.amount_inr <= max_amount)
    if payer_id:
        query = query.filter(Expense.payer_id == payer_id)
    
    # Calculate total filtered amount before pagination (optimized)
    total_filtered_amount_query = query.with_entities(func.sum(Expense.amount_inr))
    total_filtered_amount = total_filtered_amount_query.scalar() or Decimal("0.00")
    
    # Get total count and paginated results
    total = query.count()
    expenses = query.order_by(Expense.expense_date.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    # Format response (optimized - no additional queries needed due to eager loading)
    expense_list = []
    for expense in expenses:
        # Payer data is already loaded via joinedload
        payer_name = expense.payer.display_name or expense.payer.email if expense.payer else "Unknown"
        
        split_details = []
        for split in expense.splits:
            # User data is already loaded via joinedload
            user_name = split.user.display_name or split.user.email if split.user else "Unknown"
            split_details.append({
                "user_id": split.user_id,
                "user_name": user_name,
                "amount": split.amount,
                "amount_inr": split.amount_inr,
                "percentage": split.percentage
            })
        
        expense_list.append({
            "id": expense.id,
            "group_id": expense.group_id,
            "payer_id": expense.payer_id,
            "payer_name": payer_name,
            "amount": expense.amount,
            "currency": expense.currency,
            "amount_inr": expense.amount_inr,
            "description": expense.description,
            "expense_date": expense.expense_date,
            "receipt_key": expense.receipt_key,
            "created_by": expense.created_by,
            "created_at": expense.created_at,
            "splits": split_details
        })
    
    return {
        "items": expense_list,
        "total": total,
        "total_filtered_amount": total_filtered_amount,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }


@router.get("/{expense_id}")
def get_expense(
    expense_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """Get expense details."""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    
    # Validate group membership
    _validate_group_membership(expense.group_id, current_user.id, db)
    
    payer = db.query(User).filter(User.id == expense.payer_id).first()
    payer_name = payer.display_name or payer.email if payer else "Unknown"
    
    split_details = []
    for split in expense.splits:
        user = db.query(User).filter(User.id == split.user_id).first()
        user_name = user.display_name or user.email if user else "Unknown"
        split_details.append({
            "user_id": split.user_id,
            "user_name": user_name,
            "amount": split.amount,
            "amount_inr": split.amount_inr,
            "percentage": split.percentage
        })
    
    return {
        "id": expense.id,
        "group_id": expense.group_id,
        "payer_id": expense.payer_id,
        "payer_name": payer_name,
        "amount": expense.amount,
        "currency": expense.currency,
        "amount_inr": expense.amount_inr,
        "description": expense.description,
        "expense_date": expense.expense_date,
        "receipt_key": expense.receipt_key,
        "created_by": expense.created_by,
        "created_at": expense.created_at,
        "splits": split_details
    }


@router.put("/{expense_id}")
def update_expense(
    expense_id: str,
    body: ExpenseUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """Update an expense."""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    
    # Validate group membership
    _validate_group_membership(expense.group_id, current_user.id, db)
    
    # Check permissions
    can_update = (
        expense.created_by == current_user.id and has_permission(current_user, "expense.update.own", group_id=expense.group_id, db=db)
    ) or has_permission(current_user, "expense.update.any", group_id=expense.group_id, db=db)
    
    if not can_update:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=FORBIDDEN)
    
    # Update fields
    if body.description is not None:
        expense.description = body.description
    if body.expense_date is not None:
        expense.expense_date = body.expense_date
    
    # Update splits if provided
    if body.splits is not None:
        # Delete existing splits
        db.query(ExpenseSplit).filter(ExpenseSplit.expense_id == expense_id).delete()
        
        # Validate split users
        _validate_split_users(expense.group_id, body.splits, db)
        
        # Calculate new splits
        split_calculations = _calculate_splits(expense.amount, body.splits, expense.currency)
        
        # Create new splits
        for user_id, split_amount, split_amount_inr in split_calculations:
            split = ExpenseSplit(
                expense_id=expense.id,
                user_id=user_id,
                amount=split_amount,
                amount_inr=split_amount_inr,
                percentage=next((s.percentage for s in body.splits if s.user_id == user_id), None)
            )
            db.add(split)
    
    db.commit()
    
    # Invalidate balance cache
    invalidate_group_balance_cache(expense.group_id)
    invalidate_user_caches_for_group(db, expense.group_id)
    
    # Write audit log
    write_audit(
        db=db,
        actor_user_id=current_user.id,
        entity_type="expense",
        entity_id=expense.id,
        action="update",
        metadata={"group_id": expense.group_id}
    )
    
    return {"status": "updated"}


@router.delete("/{expense_id}")
def delete_expense(
    expense_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """Delete an expense (soft delete)."""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    
    # Validate group membership
    _validate_group_membership(expense.group_id, current_user.id, db)
    
    # Check permissions
    can_delete = (
        expense.created_by == current_user.id and has_permission(current_user, "expense.delete.own", group_id=expense.group_id, db=db)
    ) or has_permission(current_user, "expense.delete.any", group_id=expense.group_id, db=db)
    
    if not can_delete:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=FORBIDDEN)
    
    # Soft delete
    expense.deleted_at = datetime.utcnow()
    db.commit()
    
    # Invalidate balance cache
    invalidate_group_balance_cache(expense.group_id)
    invalidate_user_caches_for_group(db, expense.group_id)
    
    # Write audit log
    write_audit(
        db=db,
        actor_user_id=current_user.id,
        entity_type="expense",
        entity_id=expense.id,
        action="delete",
        metadata={"group_id": expense.group_id}
    )
    
    return {"status": "deleted"}


@router.post("/receipts/upload")
async def upload_receipt(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
) -> dict:
    """Upload a receipt file."""
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPEG, PNG, WebP, and PDF files are allowed"
        )
    
    # Validate file size (max 10MB)
    max_size = 10 * 1024 * 1024  # 10MB
    content = await file.read()
    if len(content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size must be less than 10MB"
        )
    
    # Generate unique filename
    file_extension = mimetypes.guess_extension(file.content_type) or ".bin"
    filename = f"receipts/{current_user.id}/{uuid.uuid4()}{file_extension}"
    
    try:
        # Upload to MinIO
        minio_client = get_minio()
        
        # Ensure bucket exists
        if not minio_client.bucket_exists(settings.minio_bucket):
            minio_client.make_bucket(settings.minio_bucket)
        
        # Upload file
        minio_client.put_object(
            bucket_name=settings.minio_bucket,
            object_name=filename,
            data=content,
            length=len(content),
            content_type=file.content_type
        )
        
        return {
            "receipt_key": filename,
            "file_name": file.filename,
            "content_type": file.content_type,
            "size": len(content)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}"
        )


@router.get("/receipts/{receipt_key}")
def get_receipt(
    receipt_key: str,
    current_user: User = Depends(get_current_user)
):
    """Get a receipt file."""
    try:
        minio_client = get_minio()
        
        # Check if file exists
        try:
            stat = minio_client.stat_object(settings.minio_bucket, receipt_key)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Receipt not found"
            )
        
        # Get file data
        response = minio_client.get_object(settings.minio_bucket, receipt_key)
        
        return {
            "content": response.read(),
            "content_type": stat.content_type,
            "size": stat.size
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve file: {str(e)}"
        )


@router.delete("/receipts/{receipt_key}")
def delete_receipt(
    receipt_key: str,
    current_user: User = Depends(get_current_user)
) -> dict:
    """Delete a receipt file."""
    try:
        minio_client = get_minio()
        
        # Check if file exists
        try:
            minio_client.stat_object(settings.minio_bucket, receipt_key)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Receipt not found"
            )
        
        # Delete file
        minio_client.remove_object(settings.minio_bucket, receipt_key)
        
        return {"status": "deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete file: {str(e)}"
        )
