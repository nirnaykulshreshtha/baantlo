"""
Auth Service - Separate FastAPI application for authentication and authorization.

This service handles all auth-related endpoints:
- /api/v1/auth/* - Authentication endpoints (login, register, token refresh, etc.)
- /api/v1/auth/otp/* - OTP verification endpoints

The service shares the same database and Redis as the main backend but runs
on a separate port (8001) for microservices architecture.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.middleware.gzip import GZipMiddleware
from fastapi import Request, HTTPException
from .core.config import settings
from .db.session import engine
from .db.base import Base
from .db.ensure_indexes import ensure_indexes
from .middleware.performance import PerformanceMiddleware
from .middleware.access_log import AccessLogMiddleware

# Import only auth-related routers
from .api.v1.endpoints import auth, otp

# Create FastAPI app for auth service
app = FastAPI(
    title=f"{settings.app_name} Auth Service",
    version="0.1.0",
    docs_url="/docs" if settings.environment in {"development", "dev", "local"} else None,
    redoc_url="/redoc" if settings.environment in {"development", "dev", "local"} else None,
    openapi_url="/openapi.json" if settings.environment in {"development", "dev", "local"} else None,
)

# Add GZip compression middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Add access log middleware
app.add_middleware(AccessLogMiddleware)

# Add performance monitoring middleware
app.add_middleware(PerformanceMiddleware, slow_request_threshold=2.0)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health() -> dict:
    """Health check endpoint for the auth service."""
    return {"status": "ok", "service": "auth"}

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """HTTP exception handler for consistent error responses."""
    try:
        from app.api.v1.errors import get_error_message
        
        status_code = exc.status_code
        detail = getattr(exc, "detail", None)
        
        if isinstance(detail, dict):
            error_code = detail.get("error") or detail.get("code") or detail.get("detail") or "error"
            message = detail.get("message") or detail.get("msg") or get_error_message(str(error_code))
            return JSONResponse(
                status_code=status_code,
                content={
                    "error_code": str(error_code),
                    "message": str(message),
                    "detail": str(error_code)
                }
            )
        elif isinstance(detail, str):
            message = get_error_message(detail)
            return JSONResponse(
                status_code=status_code,
                content={
                    "error_code": detail,
                    "message": message,
                    "detail": detail
                }
            )
        else:
            error_code = "error"
            message = get_error_message(error_code)
            return JSONResponse(
                status_code=status_code,
                content={
                    "error_code": error_code,
                    "message": message,
                    "detail": str(detail) if detail else error_code
                }
            )
    except Exception as e:
        print(f"❌ HTTP Exception handler error: {str(e)}")
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": str(exc.detail) if exc.detail else "error"}
        )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Global exception handler."""
    return JSONResponse(
        status_code=500,
        content={
            "error_code": "internal_error",
            "message": "An unexpected error occurred. Please try again.",
            "detail": "internal_error"
        }
    )

# Include only auth-related routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(otp.router, prefix="/api/v1/auth", tags=["auth"])

@app.on_event("startup")
def on_startup() -> None:
    """Initialize database and indexes on startup."""
    if settings.environment in {"development", "dev", "local"}:
        Base.metadata.create_all(bind=engine)
    try:
        ensure_indexes()
    except Exception:
        pass

