# Microservices Architecture - Auth Service & Proxy Setup

## Overview

This document describes the microservices architecture where:
1. **Auth Service** - Separate service handling all authentication/authorization
2. **API Gateway/Proxy** - Next.js API routes that proxy requests to appropriate services
3. **Frontend** - Next.js app that uses the proxy for all backend communication

## Architecture Diagram

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       │ HTTP Requests
       ▼
┌─────────────────────────────────────┐
│      Next.js Frontend (baantlo)     │
│  ┌──────────────────────────────┐  │
│  │   API Gateway/Proxy Routes    │  │
│  │  /api/auth/*  → auth-service  │  │
│  │  /api/v1/*    → backend       │  │
│  └──────────────────────────────┘  │
└──────┬──────────────────┬──────────┘
       │                  │
       │ Proxy            │ Proxy
       ▼                  ▼
┌──────────────┐  ┌──────────────┐
│ Auth Service │  │   Backend    │
│  (Port 8001) │  │  (Port 8000) │
└──────────────┘  └──────────────┘
       │                  │
       └────────┬─────────┘
                │
         ┌──────▼──────┐
         │   Database  │
         │   Redis     │
         └─────────────┘
```

## Benefits

1. **Separation of Concerns**: Auth logic isolated from business logic
2. **Independent Scaling**: Scale auth service separately
3. **Security**: Auth service can have stricter security policies
4. **Single Entry Point**: Frontend only talks to one domain (no CORS issues)
5. **Centralized Routing**: All API calls go through Next.js proxy

## Implementation

### 1. Auth Service Structure

The auth service is extracted from the main backend and runs as a separate FastAPI application.

### 2. API Gateway (Next.js API Routes)

Next.js API routes act as a reverse proxy:
- `/api/auth/*` → Proxies to auth service (port 8001)
- `/api/v1/*` → Proxies to main backend (port 8000)

### 3. Frontend Changes

Frontend code uses relative URLs:
- `fetch('/api/auth/login')` → Proxied to auth service
- `fetch('/api/v1/groups')` → Proxied to main backend

## Service Communication

- **Auth Service** ↔ **Database**: Direct connection
- **Auth Service** ↔ **Redis**: Direct connection (for rate limiting, sessions)
- **Backend** ↔ **Database**: Direct connection
- **Backend** ↔ **Redis**: Direct connection
- **Backend** ↔ **Auth Service**: Can call auth service for token validation (optional)

## Deployment

All services run in Docker containers:
- `auth-service`: Port 8001
- `backend`: Port 8000
- `baantlo`: Port 3000 (with API proxy routes)

