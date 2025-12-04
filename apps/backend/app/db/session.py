from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from ..core.config import settings


# Optimized database engine configuration for better performance
engine = create_engine(
    str(settings.database_url), 
    future=True, 
    pool_pre_ping=True,
    # Connection pool settings for better performance
    pool_size=20,  # Increased for better performance
    max_overflow=30,  # Increased for better performance
    pool_timeout=30,  # Increased timeout for better reliability
    pool_recycle=3600,  # Recycle connections after 1 hour
    pool_reset_on_return='commit',  # Reset connections when returned to pool
    # Query optimization
    echo=False,  # Set to True for SQL query logging in development
    echo_pool=False,  # Set to True for connection pool logging
    # Connection arguments for PostgreSQL optimization
    connect_args={
        "application_name": "baantlo_backend",
        "connect_timeout": 30,  # Increased timeout
    }
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)


