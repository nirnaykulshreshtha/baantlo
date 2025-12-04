# Proxy Setup Guide

## Overview

The frontend now acts as an API Gateway, proxying requests to:
- **Auth Service** (`/api/auth/*`) → Port 8001
- **Backend Service** (`/api/v1/*`) → Port 8000

## How It Works

### 1. Frontend Proxy Routes

**Auth Proxy** (`apps/baantlo/app/api/auth/[...path]/route.ts`):
- Intercepts all `/api/auth/*` requests
- Forwards to auth service at `http://auth-service:8001/api/v1/auth/*`
- Returns response to client

**Backend Proxy** (`apps/baantlo/app/api/v1/[...path]/route.ts`):
- Intercepts all `/api/v1/*` requests  
- Forwards to backend at `http://backend:8000/api/v1/*`
- Returns response to client

### 2. Frontend Code Changes

**Before** (direct backend calls):
```typescript
const response = await fetch('http://backend:8000/api/v1/auth/login', {...})
```

**After** (using proxy):
```typescript
const response = await fetch('/api/auth/login', {...})  // Proxied to auth service
const response = await fetch('/api/v1/groups', {...})   // Proxied to backend
```

### 3. Benefits

1. **No CORS Issues**: All requests go to same origin (frontend domain)
2. **Single Entry Point**: One domain for all API calls
3. **Centralized Routing**: Easy to add rate limiting, logging, etc.
4. **Service Discovery**: Frontend doesn't need to know service URLs
5. **Security**: Backend services not directly exposed to browser

## Environment Variables

Add to `.env`:
```bash
AUTH_SERVICE_PORT=8001
```

In Docker, the proxy automatically uses:
- `http://auth-service:8001` for auth service
- `http://backend:8000` for backend service

## Testing

1. **Start services**:
   ```bash
   make up
   ```

2. **Test auth proxy**:
   ```bash
   curl http://localhost:3000/api/auth/login -X POST -d '{"email":"test@example.com","password":"test"}'
   ```

3. **Test backend proxy**:
   ```bash
   curl http://localhost:3000/api/v1/groups -H "Authorization: Bearer <token>"
   ```

## Migration Steps

1. ✅ Auth service created (`app/auth_main.py`)
2. ✅ Proxy routes created
3. ✅ Docker compose updated
4. ⏳ Update frontend API clients to use relative URLs
5. ⏳ Remove direct backend URL references

## Next Steps

1. Update `lib/auth/api-client.ts` to use `/api/auth/*` instead of direct backend URLs
2. Update `lib/backend/api-client.ts` to use `/api/v1/*` (already relative)
3. Test all auth flows
4. Test all backend API calls

