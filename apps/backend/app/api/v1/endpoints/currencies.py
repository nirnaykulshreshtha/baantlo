from fastapi import APIRouter, Depends, HTTPException, status
from decimal import Decimal
from ....services.currency import get_exchange_rate, convert_to_inr, convert_from_inr
from ....core.redis import get_redis
from redis import Redis


router = APIRouter()


@router.get("")
def list_currencies() -> list[dict[str, str]]:
    """Get list of supported currencies."""
    return [
        {"code": "INR", "name": "Indian Rupee", "symbol": "₹"},
        {"code": "USD", "name": "US Dollar", "symbol": "$"},
        {"code": "EUR", "name": "Euro", "symbol": "€"},
        {"code": "GBP", "name": "British Pound", "symbol": "£"},
        {"code": "JPY", "name": "Japanese Yen", "symbol": "¥"},
        {"code": "AUD", "name": "Australian Dollar", "symbol": "$"},
        {"code": "CAD", "name": "Canadian Dollar", "symbol": "$"},
        {"code": "SGD", "name": "Singapore Dollar", "symbol": "$"},
        {"code": "AED", "name": "UAE Dirham", "symbol": "د.إ"},
    ]


@router.get("/exchange-rate/{from_currency}/{to_currency}")
async def get_exchange_rate_endpoint(
    from_currency: str,
    to_currency: str,
    r: Redis = Depends(get_redis)
) -> dict:
    """Get real-time exchange rate between two currencies."""
    try:
        rate = await get_exchange_rate(from_currency.upper(), to_currency.upper())
        return {
            "from_currency": from_currency.upper(),
            "to_currency": to_currency.upper(),
            "rate": float(rate),
            "timestamp": "2024-01-01T00:00:00Z"  # In production, add actual timestamp
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to get exchange rate: {str(e)}"
        )


@router.post("/convert")
async def convert_currency(
    amount: float,
    from_currency: str,
    to_currency: str,
    r: Redis = Depends(get_redis)
) -> dict:
    """Convert amount from one currency to another."""
    try:
        amount_decimal = Decimal(str(amount))
        
        if from_currency.upper() == to_currency.upper():
            converted_amount = amount_decimal
        elif from_currency.upper() == "INR":
            converted_amount = convert_from_inr(amount_decimal, to_currency.upper())
        elif to_currency.upper() == "INR":
            converted_amount = convert_to_inr(amount_decimal, from_currency.upper())
        else:
            # Convert from_currency to INR first, then to to_currency
            amount_inr = convert_to_inr(amount_decimal, from_currency.upper())
            converted_amount = convert_from_inr(amount_inr, to_currency.upper())
        
        return {
            "original_amount": float(amount_decimal),
            "from_currency": from_currency.upper(),
            "to_currency": to_currency.upper(),
            "converted_amount": float(converted_amount),
            "timestamp": "2024-01-01T00:00:00Z"  # In production, add actual timestamp
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to convert currency: {str(e)}"
        )


@router.get("/rates")
async def get_all_rates(base_currency: str = "INR", r: Redis = Depends(get_redis)) -> dict:
    """Get exchange rates for all supported currencies from base currency."""
    try:
        currencies = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "SGD", "AED"]
        rates = {}
        
        for currency in currencies:
            if currency != base_currency.upper():
                rate = await get_exchange_rate(base_currency.upper(), currency)
                rates[currency] = float(rate)
        
        return {
            "base_currency": base_currency.upper(),
            "rates": rates,
            "timestamp": "2024-01-01T00:00:00Z"  # In production, add actual timestamp
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to get exchange rates: {str(e)}"
        )


