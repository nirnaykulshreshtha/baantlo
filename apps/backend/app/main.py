from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.middleware.gzip import GZipMiddleware
from .api.v1.router import api_router
from .core.config import settings
from .db.session import engine
from .db.base import Base
from .db.ensure_indexes import ensure_indexes
from .db.seed_admin import seed_admin_user, seed_all_users, verify_admin_user_exists, get_admin_user_info, get_all_users_info
from .middleware.performance import PerformanceMiddleware
from .middleware.access_log import AccessLogMiddleware

# Create FastAPI app with optimized configuration
app = FastAPI(
    title=f"{settings.app_name} API", 
    version="0.1.0",
    docs_url="/docs" if settings.environment in {"development", "dev", "local"} else None,
    redoc_url="/redoc" if settings.environment in {"development", "dev", "local"} else None,
    openapi_url="/openapi.json" if settings.environment in {"development", "dev", "local"} else None,
)

# Add GZip compression middleware for better performance
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Add access log middleware with request timing (must be before other middleware to capture full request time)
app.add_middleware(AccessLogMiddleware)

# Add performance monitoring middleware
app.add_middleware(PerformanceMiddleware, slow_request_threshold=2.0)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health() -> dict:
    return {"status": "ok"}

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """
    HTTP exception handler that provides consistent error responses.
    Transforms HTTPExceptions into standardized error format with user-friendly messages.
    """
    try:
        from app.api.v1.errors import get_error_message
        
        status_code = exc.status_code
        detail = getattr(exc, "detail", None)
        
        # Handle different detail formats
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
            # Use our error message mapping for string details
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
            # Fallback for other detail types
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
        # Log the exception for debugging
        print(f"❌ HTTP Exception handler error: {str(e)}")
        # Fallback to original response
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": str(exc.detail) if exc.detail else "error"}
        )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """
    Global exception handler that provides consistent error responses.
    Transforms all exceptions into standardized error format with user-friendly messages.
    """
    try:
        from fastapi import HTTPException
        from app.api.v1.errors import get_error_message, create_error_response
        
        if isinstance(exc, HTTPException):
            status_code = exc.status_code
            detail = getattr(exc, "detail", None)
            
            # Handle different detail formats
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
                # Use our error message mapping for string details
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
                # Fallback for other detail types
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
        # Log the exception for debugging
        print(f"❌ Exception handler error: {str(e)}")
        pass
    
    # Fallback for unhandled exceptions
    return JSONResponse(
        status_code=500, 
        content={
            "error_code": "internal_error", 
            "message": "An unexpected error occurred. Please try again.",
            "detail": "internal_error"
        }
    )

app.include_router(api_router, prefix="/api/v1")


@app.on_event("startup")
def on_startup() -> None:
    if settings.environment in {"development", "dev", "local"}:
        Base.metadata.create_all(bind=engine)
    try:
        ensure_indexes()
    except Exception:
        pass
    
    # Seed users during startup
    try:
        if settings.environment in {"development", "dev", "local"}:
            # In development, seed both admin and test users
            users_seeded = seed_all_users()
            if users_seeded:
                users_info = get_all_users_info()
                if users_info and "error" not in users_info:
                    print(f"✅ User seeding completed:")
                    print(f"   - Total users: {users_info['total_users']}")
                    print(f"   - Admin users: {users_info['admin_users']}")
                    print(f"   - Basic users: {users_info['basic_users']}")
                    
                    # Show admin user details
                    admin_users = [u for u in users_info['users'] if u['role'] == 'PLATFORM_ADMIN']
                    if admin_users:
                        admin = admin_users[0]
                        print(f"   - Admin: {admin['email']} (ID: {admin['id']})")
                    
                    # Show test users
                    test_users = [u for u in users_info['users'] if u['role'] == 'BASIC_USER']
                    if test_users:
                        print(f"   - Test users: {', '.join([u['email'] for u in test_users])}")
                else:
                    print("⚠️  User seeding completed but info unavailable")
            else:
                print("❌ User seeding failed")
        else:
            # In production, only seed admin user
            admin_seeded = seed_admin_user()
            if admin_seeded:
                admin_info = get_admin_user_info()
                if admin_info:
                    print(f"✅ Admin user ready: {admin_info['email']} (ID: {admin_info['id']})")
                else:
                    print("⚠️  Admin user seeding completed but info unavailable")
            else:
                print("❌ Admin user seeding failed")
    except Exception as e:
        print(f"❌ User seeding error: {str(e)}")
