#!/usr/bin/env python3
"""
Optimized server startup script for Baant Lo backend.

This script provides optimized uvicorn configuration for better performance
in both development and production environments.
"""

import os
import sys
import uvicorn
from pathlib import Path

# Add the app directory to Python path
app_dir = Path(__file__).parent / "app"
sys.path.insert(0, str(app_dir))

def main():
    """Start the FastAPI server with optimized configuration."""
    
    # Get environment
    environment = os.getenv("ENVIRONMENT", "development")
    
    # Base configuration
    config = {
        "app": "app.main:app",
        "host": "0.0.0.0",
        "port": 8000,
        "log_level": "info",
        "access_log": False,  # Disabled - using custom AccessLogMiddleware instead
        "use_colors": True,
    }
    
    if environment in {"development", "dev", "local"}:
        # Development configuration
        config.update({
            "reload": True,
            "reload_dirs": [str(app_dir)],
            "reload_excludes": ["*.pyc", "*.pyo", "__pycache__", "*.log"],
            "workers": 1,  # Single worker for development with reload
            "loop": "uvloop",  # Use uvloop for better performance
            "http": "httptools",  # Use httptools for better HTTP parsing
            "ws": "websockets",  # Use websockets for WebSocket support
            "lifespan": "on",  # Enable lifespan events
            "timeout_keep_alive": 5,  # Keep-alive timeout
            "timeout_graceful_shutdown": 30,  # Graceful shutdown timeout
        })
    else:
        # Production configuration
        config.update({
            "reload": False,
            "workers": 3,  # Multiple workers for production
            "loop": "uvloop",
            "http": "httptools",
            "ws": "websockets",
            "lifespan": "on",
            "timeout_keep_alive": 5,
            "timeout_graceful_shutdown": 30,
            "limit_concurrency": 1000,  # Limit concurrent connections
            "limit_max_requests": 1000,  # Restart worker after N requests
            "backlog": 2048,  # Socket backlog
        })
    
    # Start the server
    uvicorn.run(**config)

if __name__ == "__main__":
    main()
