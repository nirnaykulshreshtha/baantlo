"""
Access Log Middleware for FastAPI

This middleware provides enhanced access logging with request timing information.
It logs requests in a format similar to Uvicorn's access log but includes request duration,
color coding for HTTP methods and status codes, and timestamps.
"""

from __future__ import annotations
import time
import logging
import os
from datetime import datetime
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

# Get the uvicorn.access logger to maintain consistency
access_logger = logging.getLogger("uvicorn.access")
# Ensure the logger is set to at least INFO level to log all requests
# This is important since we're replacing Uvicorn's access log
# Check effective level (takes into account parent loggers)
effective_level = access_logger.getEffectiveLevel()
if effective_level > logging.INFO:
    access_logger.setLevel(logging.INFO)
# Ensure the logger has a handler if none exists
if not access_logger.handlers:
    handler = logging.StreamHandler()
    handler.setLevel(logging.INFO)
    formatter = logging.Formatter("%(message)s")
    handler.setFormatter(formatter)
    access_logger.addHandler(handler)
    access_logger.propagate = False  # Prevent duplicate logs from root logger

# ANSI color codes
class Colors:
    """ANSI color codes for terminal output."""
    RESET = "\033[0m"
    BOLD = "\033[1m"
    
    # HTTP Method colors
    GET = "\033[36m"      # Cyan
    POST = "\033[32m"    # Green
    PUT = "\033[33m"     # Yellow
    PATCH = "\033[35m"   # Magenta
    DELETE = "\033[31m" # Red
    OPTIONS = "\033[37m" # White
    HEAD = "\033[90m"    # Bright Black
    
    # Status code colors
    STATUS_2XX = "\033[32m"  # Green for success
    STATUS_3XX = "\033[36m"  # Cyan for redirects
    STATUS_4XX = "\033[33m"  # Yellow for client errors
    STATUS_5XX = "\033[31m"  # Red for server errors
    
    # Other colors
    TIMESTAMP = "\033[90m"   # Bright Black
    DURATION = "\033[94m"   # Bright Blue
    PATH = "\033[97m"        # Bright White


class AccessLogMiddleware(BaseHTTPMiddleware):
    """
    Middleware for logging HTTP requests with timing, timestamp, and color coding.
    
    This middleware logs requests in the format:
    INFO:     [<timestamp>] <client_ip>:<port> - "<colored_method> <path> <protocol>" <colored_status> <duration>
    
    Features:
    - Request/response timing
    - Request timestamp (when request hit the server)
    - Color coding for HTTP methods and status codes
    - Consistent format with Uvicorn access logs
    - Includes request duration in seconds
    """
    
    def __init__(self, app: ASGIApp, use_colors: bool = True):
        super().__init__(app)
        # Check if colors should be enabled (terminal support and environment)
        self.use_colors = use_colors and self._should_use_colors()
    
    def _should_use_colors(self) -> bool:
        """
        Determine if colors should be used based on environment.
        
        Returns:
            True if colors should be enabled, False otherwise
        """
        # Check environment variable (can be set to disable colors)
        no_color = os.getenv("NO_COLOR") or os.getenv("FORCE_COLOR") == "0"
        if no_color:
            return False
        
        # Force color can be enabled via environment variable (even without TTY)
        force_color = os.getenv("FORCE_COLOR", "").lower() in ("1", "true", "yes")
        if force_color:
            return True
        
        # Check if we're in a terminal that supports colors
        if not os.isatty(1):  # stdout is not a TTY
            return False
        
        # Default to True if terminal supports it and no explicit disable
        return True
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process request with access logging.
        
        Args:
            request: The incoming request
            call_next: The next middleware/handler in the chain
            
        Returns:
            The response from the next handler
        """
        # Record start time and timestamp
        start_time = time.time()
        request_timestamp = datetime.now()
        
        # Get client information
        client_host = request.client.host if request.client else "unknown"
        client_port = request.client.port if request.client else 0
        
        try:
            # Process the request
            response = await call_next(request)
            
            # Calculate duration
            duration = time.time() - start_time
            
            # Log access with timing and timestamp
            self._log_access(
                client_host=client_host,
                client_port=client_port,
                method=request.method,
                path=request.url.path,
                status_code=response.status_code,
                duration=duration,
                timestamp=request_timestamp
            )
            
            return response
            
        except Exception as e:
            # Calculate duration even on error
            duration = time.time() - start_time
            
            # Determine status code from exception
            status_code = 500
            if hasattr(e, 'status_code'):
                status_code = e.status_code
            
            # Log access with error status and timestamp
            self._log_access(
                client_host=client_host,
                client_port=client_port,
                method=request.method,
                path=request.url.path,
                status_code=status_code,
                duration=duration,
                timestamp=request_timestamp
            )
            
            raise
    
    def _log_access(
        self,
        client_host: str,
        client_port: int,
        method: str,
        path: str,
        status_code: int,
        duration: float,
        timestamp: datetime
    ) -> None:
        """
        Log access request with timing, timestamp, and color coding.
        
        Args:
            client_host: Client IP address
            client_port: Client port number
            method: HTTP method
            path: Request path
            status_code: HTTP status code
            duration: Request duration in seconds
            timestamp: Timestamp when the request hit the server
        """
        # Format duration for readability (3 decimal places)
        duration_str = f"{duration:.3f}s"
        
        # Format timestamp (ISO 8601 format with milliseconds)
        timestamp_str = timestamp.strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]  # Remove last 3 digits of microseconds
        
        # Get status text
        status_text = self._get_status_text(status_code)
        status_str = f"{status_code} {status_text}" if status_text else str(status_code)
        
        # Apply colors if enabled
        if self.use_colors:
            method_color = self._get_method_color(method)
            status_color = self._get_status_color(status_code)
            timestamp_colored = f"{Colors.TIMESTAMP}[{timestamp_str}]{Colors.RESET}"
            method_colored = f"{method_color}{Colors.BOLD}{method}{Colors.RESET}"
            path_colored = f"{Colors.PATH}{path}{Colors.RESET}"
            status_colored = f"{status_color}{status_str}{Colors.RESET}"
            duration_colored = f"{Colors.DURATION}({duration_str}){Colors.RESET}"
            
            # Log in Uvicorn-style format with timing, timestamp, and colors
            log_message = (
                f'{timestamp_colored} {client_host}:{client_port} - '
                f'"{method_colored} {path_colored} HTTP/1.1" '
                f'{status_colored} {duration_colored}'
            )
        else:
            # Log without colors
            log_message = (
                f'[{timestamp_str}] {client_host}:{client_port} - "{method} {path} HTTP/1.1" '
                f'{status_str} ({duration_str})'
            )
        
        # Use appropriate log level based on status code
        if status_code >= 500:
            access_logger.error(log_message)
        elif status_code >= 400:
            access_logger.warning(log_message)
        else:
            access_logger.info(log_message)
    
    def _get_method_color(self, method: str) -> str:
        """
        Get color code for HTTP method.
        
        Args:
            method: HTTP method (GET, POST, PUT, etc.)
            
        Returns:
            ANSI color code string
        """
        method_colors = {
            "GET": Colors.GET,
            "POST": Colors.POST,
            "PUT": Colors.PUT,
            "PATCH": Colors.PATCH,
            "DELETE": Colors.DELETE,
            "OPTIONS": Colors.OPTIONS,
            "HEAD": Colors.HEAD,
        }
        return method_colors.get(method.upper(), Colors.RESET)
    
    def _get_status_color(self, status_code: int) -> str:
        """
        Get color code for HTTP status code.
        
        Args:
            status_code: HTTP status code
            
        Returns:
            ANSI color code string
        """
        if 200 <= status_code < 300:
            return Colors.STATUS_2XX
        elif 300 <= status_code < 400:
            return Colors.STATUS_3XX
        elif 400 <= status_code < 500:
            return Colors.STATUS_4XX
        elif 500 <= status_code < 600:
            return Colors.STATUS_5XX
        else:
            return Colors.RESET
    
    def _get_status_text(self, status_code: int) -> str:
        """
        Get HTTP status text for common status codes.
        
        Args:
            status_code: HTTP status code
            
        Returns:
            Status text string
        """
        status_texts = {
            200: "OK",
            201: "Created",
            202: "Accepted",
            204: "No Content",
            301: "Moved Permanently",
            302: "Found",
            304: "Not Modified",
            400: "Bad Request",
            401: "Unauthorized",
            403: "Forbidden",
            404: "Not Found",
            405: "Method Not Allowed",
            409: "Conflict",
            422: "Unprocessable Entity",
            429: "Too Many Requests",
            500: "Internal Server Error",
            502: "Bad Gateway",
            503: "Service Unavailable",
        }
        return status_texts.get(status_code, "")

