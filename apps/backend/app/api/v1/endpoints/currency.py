from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from decimal import Decimal
from typing import Dict, Any

from ....db.deps import get_db
from ....auth.deps import get_current_user
from ....db.models import User
from ....services.currency import (
    get_exchange_rate,
    get_latest_rates,
    format_currency,
    get_currency_info,
    get_supported_currencies,
    validate_currency,
    convert_to_inr,
    convert_from_inr
)

router = APIRouter()


@router.get("/supported")
def get_supported_currencies_endpoint() -> Dict[str, Any]:
    """Get all supported currencies with their information."""
    return {
        "currencies": get_supported_currencies(),
        "count": len(get_supported_currencies())
    }


@router.get("/info/{currency}")
def get_currency_info_endpoint(currency: str) -> Dict[str, Any]:
    """Get information about a specific currency."""
    if not validate_currency(currency):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Currency {currency} is not supported"
        )
    
    info = get_currency_info(currency)
    return {"currency": currency, "info": info}


@router.get("/rate")
async def get_exchange_rate_endpoint(
    from_currency: str = Query(..., description="Source currency code"),
    to_currency: str = Query(..., description="Target currency code"),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get exchange rate between two currencies."""
    if not validate_currency(from_currency):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Source currency {from_currency} is not supported"
        )
    
    if not validate_currency(to_currency):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Target currency {to_currency} is not supported"
        )
    
    try:
        rate = await get_exchange_rate(from_currency, to_currency)
        return {
            "from_currency": from_currency,
            "to_currency": to_currency,
            "rate": str(rate),
            "formatted_rate": f"1 {from_currency} = {rate} {to_currency}"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch exchange rate: {str(e)}"
        )


@router.get("/rates")
async def get_latest_rates_endpoint(
    base_currency: str = Query("INR", description="Base currency for rates"),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get latest exchange rates for all supported currencies."""
    if not validate_currency(base_currency):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Base currency {base_currency} is not supported"
        )
    
    try:
        rates = await get_latest_rates(base_currency)
        return {
            "base_currency": base_currency,
            "rates": {currency: str(rate) for currency, rate in rates.items()},
            "count": len(rates)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch exchange rates: {str(e)}"
        )


@router.post("/convert")
async def convert_currency_endpoint(
    amount: Decimal,
    from_currency: str,
    to_currency: str,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Convert amount from one currency to another."""
    if not validate_currency(from_currency):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Source currency {from_currency} is not supported"
        )
    
    if not validate_currency(to_currency):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Target currency {to_currency} is not supported"
        )
    
    if amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Amount must be positive"
        )
    
    try:
        if from_currency == to_currency:
            converted_amount = amount
            rate = Decimal("1.0")
        else:
            rate = await get_exchange_rate(from_currency, to_currency)
            converted_amount = amount * rate
        
        return {
            "original_amount": str(amount),
            "from_currency": from_currency,
            "to_currency": to_currency,
            "converted_amount": str(converted_amount),
            "exchange_rate": str(rate),
            "formatted_original": format_currency(amount, from_currency),
            "formatted_converted": format_currency(converted_amount, to_currency)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to convert currency: {str(e)}"
        )


@router.post("/convert-to-inr")
def convert_to_inr_endpoint(
    amount: Decimal,
    currency: str,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Convert amount to INR (synchronous fallback)."""
    if not validate_currency(currency):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Currency {currency} is not supported"
        )
    
    if amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Amount must be positive"
        )
    
    try:
        amount_inr = convert_to_inr(amount, currency)
        return {
            "original_amount": str(amount),
            "currency": currency,
            "amount_inr": str(amount_inr),
            "formatted_original": format_currency(amount, currency),
            "formatted_inr": format_currency(amount_inr, "INR")
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to convert to INR: {str(e)}"
        )


@router.post("/convert-from-inr")
def convert_from_inr_endpoint(
    amount_inr: Decimal,
    to_currency: str,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Convert INR amount to another currency (synchronous fallback)."""
    if not validate_currency(to_currency):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Target currency {to_currency} is not supported"
        )
    
    if amount_inr <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Amount must be positive"
        )
    
    try:
        converted_amount = convert_from_inr(amount_inr, to_currency)
        return {
            "amount_inr": str(amount_inr),
            "to_currency": to_currency,
            "converted_amount": str(converted_amount),
            "formatted_inr": format_currency(amount_inr, "INR"),
            "formatted_converted": format_currency(converted_amount, to_currency)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to convert from INR: {str(e)}"
        )
