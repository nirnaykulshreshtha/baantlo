/**
 * @file env.ts
 * @description Runtime environment validation for the Baant Lo web application.
 * Validates critical authentication variables at boot using Zod and surfaces
 * actionable errors when misconfigured.
 * 
 * Supports both BACKEND_API_URL and AUTH_BACKEND_URL for backwards compatibility.
 * When running in Docker, use the service name (e.g., http://backend:8000) instead of localhost.
 */

import { z } from "zod"

const envSchema = z.object({
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters"),
  NEXTAUTH_URL: z
    .string()
    .url("NEXTAUTH_URL must be a valid URL")
    .optional(),
  BACKEND_API_URL: z.string().url("BACKEND_API_URL must be a valid URL"),
})

// Support both BACKEND_API_URL and AUTH_BACKEND_URL for compatibility
// AUTH_BACKEND_URL is used in docker-compose, BACKEND_API_URL is the preferred name
let backendUrl = process.env.BACKEND_API_URL || process.env.AUTH_BACKEND_URL

// Detect if running in Docker (check for /app working directory or Docker-specific env vars)
// Note: We avoid using 'fs' module here as this file is imported by client components
// and 'fs' is only available in Node.js server-side code
let isInDocker = false
if (typeof window === "undefined") {
  // Server-side only: can use process.cwd()
  try {
    isInDocker = 
      process.cwd() === "/app" || 
      process.env.DOCKER_CONTAINER === "true" ||
      process.env.IS_DOCKER === "true"
  } catch {
    // Fallback to env var check only
    isInDocker = process.env.DOCKER_CONTAINER === "true" || process.env.IS_DOCKER === "true"
  }
} else {
  // Client-side: rely only on environment variables
  isInDocker = process.env.NEXT_PUBLIC_IS_DOCKER === "true"
}

// Auto-fix: If in Docker and using localhost, replace with Docker service name
if (isInDocker && backendUrl) {
  try {
    const url = new URL(backendUrl)
    const hostname = url.hostname
    
    // If using localhost/127.0.0.1 in Docker, replace with service name
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      const port = url.port || (url.protocol === "https:" ? "443" : "80")
      const path = url.pathname
      const newUrl = `${url.protocol}//backend:${port}${path}`
      
      console.warn(`[Env] ⚠️  Detected Docker environment but backend URL uses localhost.`)
      console.warn(`[Env] Auto-correcting: ${backendUrl} → ${newUrl}`)
      console.warn(`[Env] To avoid this, set BACKEND_API_URL=http://backend:8000/api/v1 in your environment.`)
      
      backendUrl = newUrl
    }
  } catch (e) {
    // Invalid URL, will be caught by validation below
  }
}

const rawEnv = {
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL:
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined),
  BACKEND_API_URL: backendUrl,
}

const parsed = envSchema.safeParse(rawEnv)

if (!parsed.success) {
  console.error("❌ Invalid environment configuration:", parsed.error.flatten().fieldErrors)
  console.error("💡 Tips:")
  console.error("   - Set BACKEND_API_URL or AUTH_BACKEND_URL to your backend URL")
  console.error("   - If running in Docker, use the service name (e.g., http://backend:8000)")
  console.error("   - If running locally, use http://localhost:8000")
  throw new Error("Environment validation failed. Check lib/env.ts for required variables.")
}

export const env = parsed.data
