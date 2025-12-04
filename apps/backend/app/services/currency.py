from __future__ import annotations
import logging
from decimal import Decimal
from typing import Optional, Dict, Any
import httpx
import asyncio
from datetime import datetime, timedelta
from redis import Redis
from ..core.redis import get_redis
from ..core.config import settings

logger = logging.getLogger(__name__)

# Cache exchange rates for 1 hour
EXCHANGE_RATE_CACHE_TTL = 3600

# Supported currencies with their symbols and names
SUPPORTED_CURRENCIES = {
    "INR": {"symbol": "₹", "name": "Indian Rupee", "decimal_places": 2},
    "USD": {"symbol": "$", "name": "US Dollar", "decimal_places": 2},
    "EUR": {"symbol": "€", "name": "Euro", "decimal_places": 2},
    "GBP": {"symbol": "£", "name": "British Pound", "decimal_places": 2},
    "JPY": {"symbol": "¥", "name": "Japanese Yen", "decimal_places": 0},
    "AUD": {"symbol": "A$", "name": "Australian Dollar", "decimal_places": 2},
    "CAD": {"symbol": "C$", "name": "Canadian Dollar", "decimal_places": 2},
    "SGD": {"symbol": "S$", "name": "Singapore Dollar", "decimal_places": 2},
    "AED": {"symbol": "د.إ", "name": "UAE Dirham", "decimal_places": 2},
    "CHF": {"symbol": "CHF", "name": "Swiss Franc", "decimal_places": 2},
    "CNY": {"symbol": "¥", "name": "Chinese Yuan", "decimal_places": 2},
}

async def get_exchange_rate(from_currency: str, to_currency: str) -> Decimal:
    """Get exchange rate between two currencies, with caching."""
    if from_currency == to_currency:
        return Decimal("1.0")
    
    cache_key = f"exchange_rate:{from_currency}:{to_currency}"
    
    # Try to get from cache first
    try:
        r = get_redis()
        cached_rate = r.get(cache_key)
        if cached_rate:
            return Decimal(cached_rate.decode())
    except Exception as e:
        logger.warning(f"Failed to get exchange rate from cache: {e}")
    
    # Fetch from external API
    try:
        rate = await _fetch_exchange_rate(from_currency, to_currency)
        
        # Cache the result
        try:
            r = get_redis()
            r.setex(cache_key, EXCHANGE_RATE_CACHE_TTL, str(rate))
        except Exception as e:
            logger.warning(f"Failed to cache exchange rate: {e}")
        
        return rate
    except Exception as e:
        logger.error(f"Failed to fetch exchange rate: {e}")
        # Fallback to 1.0 for same currency or return a default rate
        if from_currency == "INR" and to_currency == "USD":
            return Decimal("0.012")  # Approximate fallback
        elif from_currency == "USD" and to_currency == "INR":
            return Decimal("83.0")  # Approximate fallback
        else:
            return Decimal("1.0")


async def _fetch_exchange_rate(from_currency: str, to_currency: str) -> Decimal:
    """Fetch exchange rate from external API with multiple providers."""
    # Try multiple API providers in order of preference
    providers = [
        _fetch_from_exchangerate_api,
        _fetch_from_fixer_io,
        _fetch_from_currency_api,
    ]
    
    last_error = None
    for provider in providers:
        try:
            rate = await provider(from_currency, to_currency)
            if rate and rate > 0:
                logger.info(f"Successfully fetched rate {from_currency}->{to_currency}: {rate} from {provider.__name__}")
                return rate
        except Exception as e:
            logger.warning(f"Provider {provider.__name__} failed: {e}")
            last_error = e
            continue
    
    # If all providers fail, raise the last error
    raise Exception(f"All exchange rate providers failed. Last error: {last_error}")


async def _fetch_from_exchangerate_api(from_currency: str, to_currency: str) -> Decimal:
    """Fetch from exchangerate-api.com (free tier, no API key required)."""
    url = f"https://api.exchangerate-api.com/v4/latest/{from_currency}"
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(url)
        response.raise_for_status()
        data = response.json()
        
        if to_currency not in data["rates"]:
            raise ValueError(f"Currency {to_currency} not supported")
        
        return Decimal(str(data["rates"][to_currency]))


async def _fetch_from_fixer_io(from_currency: str, to_currency: str) -> Decimal:
    """Fetch from fixer.io (requires API key)."""
    # This would require a fixer.io API key
    # For now, we'll skip this provider
    raise Exception("Fixer.io provider not configured")


async def _fetch_from_currency_api(from_currency: str, to_currency: str) -> Decimal:
    """Fetch from currencyapi.com (free tier with API key)."""
    # This would require a currencyapi.com API key
    # For now, we'll skip this provider
    raise Exception("Currency API provider not configured")


def convert_to_inr(amount: Decimal, currency: str) -> Decimal:
    """Convert any currency amount to INR with caching."""
    if currency == "INR":
        return amount
    
    # Try to get from cache first
    cache_key = f"conversion_rate:{currency}:INR"
    try:
        r = get_redis()
        cached_rate = r.get(cache_key)
        if cached_rate:
            rate = Decimal(cached_rate.decode())
            logger.info(f"Using cached conversion rate {currency}->INR: {rate}")
            return amount * rate
    except Exception as e:
        logger.warning(f"Failed to get conversion rate from cache: {e}")
    
    # Fallback to static rates (updated periodically)
    conversion_rates = {
        "USD": Decimal("83.0"),
        "EUR": Decimal("90.0"),
        "GBP": Decimal("105.0"),
        "JPY": Decimal("0.55"),
        "AUD": Decimal("55.0"),
        "CAD": Decimal("61.0"),
        "SGD": Decimal("61.0"),
        "AED": Decimal("22.6"),
    }
    
    rate = conversion_rates.get(currency, Decimal("1.0"))
    
    # Cache the rate for 1 hour
    try:
        r = get_redis()
        r.setex(cache_key, 3600, str(rate))
    except Exception as e:
        logger.warning(f"Failed to cache conversion rate: {e}")
    
    return amount * rate


def convert_from_inr(amount_inr: Decimal, to_currency: str) -> Decimal:
    """Convert INR amount to another currency."""
    if to_currency == "INR":
        return amount_inr
    
    conversion_rates = {
        "USD": Decimal("0.012"),
        "EUR": Decimal("0.011"),
        "GBP": Decimal("0.0095"),
        "JPY": Decimal("1.82"),
        "AUD": Decimal("0.018"),
        "CAD": Decimal("0.016"),
        "SGD": Decimal("0.016"),
        "AED": Decimal("0.044"),
    }
    
    rate = conversion_rates.get(to_currency, Decimal("1.0"))
    return amount_inr * rate


def format_currency(amount: Decimal, currency: str) -> str:
    """Format amount with proper currency symbol and decimal places."""
    if currency not in SUPPORTED_CURRENCIES:
        return f"{amount} {currency}"
    
    currency_info = SUPPORTED_CURRENCIES[currency]
    symbol = currency_info["symbol"]
    decimal_places = currency_info["decimal_places"]
    
    # Round to appropriate decimal places
    rounded_amount = amount.quantize(Decimal('0.01') if decimal_places == 2 else Decimal('1'))
    
    if currency == "INR":
        # Indian number formatting (lakhs, crores)
        if rounded_amount >= 10000000:  # 1 crore
            return f"{symbol}{rounded_amount / 10000000:.2f}Cr"
        elif rounded_amount >= 100000:  # 1 lakh
            return f"{symbol}{rounded_amount / 100000:.2f}L"
        else:
            return f"{symbol}{rounded_amount:,.2f}"
    else:
        # Standard formatting
        return f"{symbol}{rounded_amount:,.{decimal_places}f}"


def get_currency_info(currency: str) -> Optional[Dict[str, Any]]:
    """Get currency information including symbol, name, and decimal places."""
    return SUPPORTED_CURRENCIES.get(currency)


def get_supported_currencies() -> Dict[str, Dict[str, Any]]:
    """Get all supported currencies."""
    return SUPPORTED_CURRENCIES.copy()


def validate_currency(currency: str) -> bool:
    """Validate if currency is supported."""
    return currency in SUPPORTED_CURRENCIES


async def get_latest_rates(base_currency: str = "INR") -> Dict[str, Decimal]:
    """Get latest exchange rates for all supported currencies."""
    rates = {}
    
    for currency in SUPPORTED_CURRENCIES:
        if currency != base_currency:
            try:
                rate = await get_exchange_rate(base_currency, currency)
                rates[currency] = rate
            except Exception as e:
                logger.warning(f"Failed to get rate for {base_currency}->{currency}: {e}")
                # Use fallback rate
                rates[currency] = _get_fallback_rate(base_currency, currency)
    
    return rates


def _get_fallback_rate(from_currency: str, to_currency: str) -> Decimal:
    """Get fallback exchange rate when API fails."""
    fallback_rates = {
        ("INR", "USD"): Decimal("0.012"),
        ("INR", "EUR"): Decimal("0.011"),
        ("INR", "GBP"): Decimal("0.0095"),
        ("INR", "JPY"): Decimal("1.82"),
        ("INR", "AUD"): Decimal("0.018"),
        ("INR", "CAD"): Decimal("0.016"),
        ("INR", "SGD"): Decimal("0.016"),
        ("INR", "AED"): Decimal("0.044"),
        ("USD", "INR"): Decimal("83.0"),
        ("EUR", "INR"): Decimal("90.0"),
        ("GBP", "INR"): Decimal("105.0"),
        ("JPY", "INR"): Decimal("0.55"),
        ("AUD", "INR"): Decimal("55.0"),
        ("CAD", "INR"): Decimal("61.0"),
        ("SGD", "INR"): Decimal("61.0"),
        ("AED", "INR"): Decimal("22.6"),
    }
    
    return fallback_rates.get((from_currency, to_currency), Decimal("1.0"))
