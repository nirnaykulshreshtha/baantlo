# syntax=docker/dockerfile:1.7

########## Build stage - install dependencies ##########
FROM python:3.12-slim AS builder
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1
WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY pyproject.toml .

# Install Python dependencies
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --upgrade pip && \
    pip install --user -e .

########## Runtime stage - minimal image ##########
FROM python:3.12-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH=/root/.local/bin:$PATH

# Build arguments (can be overridden at build time)
ARG SECRET_KEY
ARG ADMIN_EMAIL
ARG ADMIN_PASSWORD

# Environment variables (set from build args or env)
ENV SECRET_KEY=${SECRET_KEY} \
    ADMIN_EMAIL=${ADMIN_EMAIL} \
    ADMIN_PASSWORD=${ADMIN_PASSWORD}

WORKDIR /app

# Copy only installed packages from builder (not build tools)
COPY --from=builder /root/.local /root/.local

# Copy application code
COPY app ./app
COPY start_server.py .

# Remove unnecessary files
RUN find /app -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true && \
    find /app -type f -name "*.pyc" -delete 2>/dev/null || true

########## Development stage ##########
FROM runtime AS dev
ENV ENVIRONMENT=development
CMD ["python", "start_server.py"]

########## Production stage ##########
FROM runtime AS prod
ENV ENVIRONMENT=production
CMD ["python", "start_server.py"]
