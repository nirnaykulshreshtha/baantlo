"""
Performance monitoring middleware for FastAPI.

This middleware provides comprehensive performance monitoring including:
- Request/response timing
- Database query monitoring
- Memory usage tracking
- Slow query detection
- Performance metrics logging
"""

from __future__ import annotations
import time
import logging
import psutil
import os
import asyncio
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

logger = logging.getLogger(__name__)

class PerformanceMiddleware(BaseHTTPMiddleware):
    """
    Middleware for monitoring API performance and logging slow requests.
    
    Features:
    - Request/response timing
    - Memory usage monitoring
    - Slow request detection
    - Performance metrics logging
    """
    
    def __init__(self, app: ASGIApp, slow_request_threshold: float = 1.0):
        super().__init__(app)
        self.slow_request_threshold = slow_request_threshold
        self.process = psutil.Process(os.getpid())
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process request with performance monitoring.
        
        Args:
            request: The incoming request
            call_next: The next middleware/handler in the chain
            
        Returns:
            The response from the next handler
        """
        # Record start time and memory
        start_time = time.time()
        start_memory = self.process.memory_info().rss / 1024 / 1024  # MB
        
        # Log request start
        logger.info(f"🚀 Request started: {request.method} {request.url.path}")
        
        try:
            # Process the request
            response = await call_next(request)
            
            # Calculate performance metrics
            end_time = time.time()
            end_memory = self.process.memory_info().rss / 1024 / 1024  # MB
            
            duration = end_time - start_time
            memory_delta = end_memory - start_memory
            
            # Log performance metrics
            self._log_performance_metrics(
                request=request,
                response=response,
                duration=duration,
                memory_delta=memory_delta,
                start_memory=start_memory,
                end_memory=end_memory
            )
            
            # Add performance headers
            response.headers["X-Response-Time"] = f"{duration:.3f}s"
            response.headers["X-Memory-Usage"] = f"{end_memory:.1f}MB"
            
            return response
            
        except Exception as e:
            # Log error with performance context
            end_time = time.time()
            duration = end_time - start_time
            
            logger.error(
                f"❌ Request failed: {request.method} {request.url.path} "
                f"after {duration:.3f}s - {str(e)}"
            )
            raise
    
    def _log_performance_metrics(
        self,
        request: Request,
        response: Response,
        duration: float,
        memory_delta: float,
        start_memory: float,
        end_memory: float
    ) -> None:
        """
        Log performance metrics for the request.
        
        Args:
            request: The request object
            response: The response object
            duration: Request duration in seconds
            memory_delta: Memory usage change in MB
            start_memory: Starting memory usage in MB
            end_memory: Ending memory usage in MB
        """
        # Determine log level based on performance
        if duration > self.slow_request_threshold:
            log_level = "WARNING"
            emoji = "🐌"
        elif duration > 0.5:
            log_level = "INFO"
            emoji = "⚠️"
        else:
            log_level = "DEBUG"
            emoji = "✅"
        
        # Format performance message
        message = (
            f"{emoji} Request completed: {request.method} {request.url.path} "
            f"-> {response.status_code} in {duration:.3f}s "
            f"(Memory: {start_memory:.1f}MB -> {end_memory:.1f}MB, Δ{memory_delta:+.1f}MB)"
        )
        
        # Add query parameters for context
        if request.query_params:
            message += f" | Query: {dict(request.query_params)}"
        
        # Log with appropriate level
        if log_level == "WARNING":
            logger.warning(message)
        elif log_level == "INFO":
            logger.info(message)
        else:
            logger.debug(message)
        
        # Log slow requests with additional context
        if duration > self.slow_request_threshold:
            logger.warning(
                f"🐌 SLOW REQUEST DETECTED: {request.method} {request.url.path} "
                f"took {duration:.3f}s (threshold: {self.slow_request_threshold}s) "
                f"| Status: {response.status_code} | Memory: {memory_delta:+.1f}MB"
            )


class DatabaseQueryLogger:
    """
    Context manager for logging database query performance.
    
    Usage:
        with DatabaseQueryLogger("user_lookup", user_id=user_id):
            user = db.query(User).filter(User.id == user_id).first()
    """
    
    def __init__(self, operation: str, **context):
        self.operation = operation
        self.context = context
        self.start_time = None
    
    def __enter__(self):
        self.start_time = time.time()
        logger.debug(f"🔍 DB Query started: {self.operation} | Context: {self.context}")
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.start_time:
            duration = time.time() - self.start_time
            if exc_type:
                logger.error(f"❌ DB Query failed: {self.operation} after {duration:.3f}s | Error: {exc_val}")
            else:
                logger.debug(f"✅ DB Query completed: {self.operation} in {duration:.3f}s")


def log_database_operation(operation: str, **context):
    """
    Decorator for logging database operations.
    
    Args:
        operation: Description of the database operation
        **context: Additional context for logging
    """
    def decorator(func):
        async def async_wrapper(*args, **kwargs):
            with DatabaseQueryLogger(operation, **context):
                return await func(*args, **kwargs)
        
        def sync_wrapper(*args, **kwargs):
            with DatabaseQueryLogger(operation, **context):
                return func(*args, **kwargs)
        
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator
