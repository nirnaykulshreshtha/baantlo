"""
Performance configuration and monitoring utilities.

This module provides centralized performance configuration and utilities
for monitoring and optimizing the backend service.
"""

from __future__ import annotations
import logging
import time
from typing import Dict, Any, Optional
from decimal import Decimal
from ..core.config import settings

logger = logging.getLogger(__name__)

class PerformanceConfig:
    """
    Centralized performance configuration.
    
    This class contains all performance-related settings and thresholds
    used throughout the application.
    """
    
    # Request timing thresholds (in seconds)
    SLOW_REQUEST_THRESHOLD = 1.0
    VERY_SLOW_REQUEST_THRESHOLD = 3.0
    CRITICAL_REQUEST_THRESHOLD = 10.0
    
    # Database query thresholds (in seconds)
    SLOW_QUERY_THRESHOLD = 0.5
    VERY_SLOW_QUERY_THRESHOLD = 2.0
    CRITICAL_QUERY_THRESHOLD = 5.0
    
    # Memory usage thresholds (in MB)
    HIGH_MEMORY_THRESHOLD = 500
    CRITICAL_MEMORY_THRESHOLD = 1000
    
    # Cache TTL settings (in seconds)
    BALANCE_CACHE_TTL = 300  # 5 minutes
    CURRENCY_CACHE_TTL = 3600  # 1 hour
    USER_CACHE_TTL = 1800  # 30 minutes
    
    # Database connection pool settings
    DB_POOL_SIZE = 20
    DB_MAX_OVERFLOW = 30
    DB_POOL_TIMEOUT = 30
    DB_POOL_RECYCLE = 3600
    
    # Pagination settings
    DEFAULT_PAGE_SIZE = 20
    MAX_PAGE_SIZE = 200
    LARGE_PAGE_SIZE_THRESHOLD = 100
    
    # Logging settings
    ENABLE_PERFORMANCE_LOGGING = True
    ENABLE_SLOW_QUERY_LOGGING = True
    ENABLE_MEMORY_MONITORING = True
    
    @classmethod
    def get_threshold_for_duration(cls, duration: float) -> str:
        """
        Get the threshold category for a given duration.
        
        Args:
            duration: Duration in seconds
            
        Returns:
            Threshold category string
        """
        if duration >= cls.CRITICAL_REQUEST_THRESHOLD:
            return "CRITICAL"
        elif duration >= cls.VERY_SLOW_REQUEST_THRESHOLD:
            return "VERY_SLOW"
        elif duration >= cls.SLOW_REQUEST_THRESHOLD:
            return "SLOW"
        else:
            return "NORMAL"
    
    @classmethod
    def get_threshold_for_query_duration(cls, duration: float) -> str:
        """
        Get the threshold category for a given query duration.
        
        Args:
            duration: Duration in seconds
            
        Returns:
            Threshold category string
        """
        if duration >= cls.CRITICAL_QUERY_THRESHOLD:
            return "CRITICAL"
        elif duration >= cls.VERY_SLOW_QUERY_THRESHOLD:
            return "VERY_SLOW"
        elif duration >= cls.SLOW_QUERY_THRESHOLD:
            return "SLOW"
        else:
            return "NORMAL"


class PerformanceMetrics:
    """
    Performance metrics collector and analyzer.
    
    This class provides utilities for collecting, analyzing, and reporting
    performance metrics across the application.
    """
    
    def __init__(self):
        self.metrics: Dict[str, Any] = {}
        self.start_time = time.time()
    
    def record_request(
        self,
        method: str,
        path: str,
        duration: float,
        status_code: int,
        memory_usage: float
    ) -> None:
        """
        Record a request performance metric.
        
        Args:
            method: HTTP method
            path: Request path
            duration: Request duration in seconds
            status_code: HTTP status code
            memory_usage: Memory usage in MB
        """
        key = f"{method}:{path}"
        
        if key not in self.metrics:
            self.metrics[key] = {
                "count": 0,
                "total_duration": 0.0,
                "min_duration": float('inf'),
                "max_duration": 0.0,
                "avg_duration": 0.0,
                "status_codes": {},
                "memory_usage": 0.0,
                "slow_requests": 0,
                "errors": 0
            }
        
        metric = self.metrics[key]
        metric["count"] += 1
        metric["total_duration"] += duration
        metric["min_duration"] = min(metric["min_duration"], duration)
        metric["max_duration"] = max(metric["max_duration"], duration)
        metric["avg_duration"] = metric["total_duration"] / metric["count"]
        metric["memory_usage"] = memory_usage
        
        # Track status codes
        status_str = str(status_code)
        metric["status_codes"][status_str] = metric["status_codes"].get(status_str, 0) + 1
        
        # Track slow requests
        if duration > PerformanceConfig.SLOW_REQUEST_THRESHOLD:
            metric["slow_requests"] += 1
        
        # Track errors
        if status_code >= 400:
            metric["errors"] += 1
    
    def get_summary(self) -> Dict[str, Any]:
        """
        Get a summary of all performance metrics.
        
        Returns:
            Dictionary containing performance summary
        """
        uptime = time.time() - self.start_time
        
        total_requests = sum(metric["count"] for metric in self.metrics.values())
        total_slow_requests = sum(metric["slow_requests"] for metric in self.metrics.values())
        total_errors = sum(metric["errors"] for metric in self.metrics.values())
        
        return {
            "uptime_seconds": uptime,
            "total_requests": total_requests,
            "total_slow_requests": total_slow_requests,
            "total_errors": total_errors,
            "slow_request_percentage": (total_slow_requests / total_requests * 100) if total_requests > 0 else 0,
            "error_percentage": (total_errors / total_requests * 100) if total_requests > 0 else 0,
            "endpoints": self.metrics
        }
    
    def get_slowest_endpoints(self, limit: int = 10) -> list:
        """
        Get the slowest endpoints by average duration.
        
        Args:
            limit: Maximum number of endpoints to return
            
        Returns:
            List of endpoint performance data
        """
        endpoints = []
        for key, metric in self.metrics.items():
            if metric["count"] > 0:
                endpoints.append({
                    "endpoint": key,
                    "avg_duration": metric["avg_duration"],
                    "max_duration": metric["max_duration"],
                    "count": metric["count"],
                    "slow_requests": metric["slow_requests"]
                })
        
        return sorted(endpoints, key=lambda x: x["avg_duration"], reverse=True)[:limit]


# Global performance metrics instance
performance_metrics = PerformanceMetrics()


def log_performance_issue(
    issue_type: str,
    message: str,
    context: Optional[Dict[str, Any]] = None
) -> None:
    """
    Log a performance issue with appropriate severity.
    
    Args:
        issue_type: Type of performance issue
        message: Description of the issue
        context: Additional context data
    """
    context_str = f" | Context: {context}" if context else ""
    
    if issue_type == "CRITICAL":
        logger.critical(f"🚨 CRITICAL PERFORMANCE ISSUE: {message}{context_str}")
    elif issue_type == "VERY_SLOW":
        logger.error(f"🐌 VERY SLOW PERFORMANCE: {message}{context_str}")
    elif issue_type == "SLOW":
        logger.warning(f"⚠️ SLOW PERFORMANCE: {message}{context_str}")
    else:
        logger.info(f"ℹ️ PERFORMANCE INFO: {message}{context_str}")


def format_duration(duration: float) -> str:
    """
    Format duration in a human-readable way.
    
    Args:
        duration: Duration in seconds
        
    Returns:
        Formatted duration string
    """
    if duration < 0.001:
        return f"{duration * 1000000:.0f}μs"
    elif duration < 1:
        return f"{duration * 1000:.1f}ms"
    else:
        return f"{duration:.3f}s"


def format_memory(memory_mb: float) -> str:
    """
    Format memory usage in a human-readable way.
    
    Args:
        memory_mb: Memory usage in MB
        
    Returns:
        Formatted memory string
    """
    if memory_mb < 1024:
        return f"{memory_mb:.1f}MB"
    else:
        return f"{memory_mb / 1024:.1f}GB"
