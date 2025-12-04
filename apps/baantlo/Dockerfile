# syntax=docker/dockerfile:1.7

########## Base image ##########
FROM node:22-alpine AS base
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1
# Sharp and other native deps work better with this
RUN apk add --no-cache libc6-compat

########## Install deps (cached) ##########
FROM base AS deps
# Copy only lockfiles + manifest for better cache hits
COPY package.json package-lock.json* ./
# Cache npm directory between builds
RUN --mount=type=cache,target=/root/.npm \
    npm ci

########## Build (standalone) ##########
FROM base AS build
ENV NODE_ENV=production
# Bring node_modules for build, then app source
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Ensure Next produces the minimal server bundle
# Requires: next.config.ts -> export default { output: 'standalone' }
RUN --mount=type=cache,target=/root/.npm \
    npm run build

########## Production runtime ##########
# Only the standalone server and static assets. No dev deps. No full node_modules.
FROM node:22-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    NEXT_TELEMETRY_DISABLED=1
# Optional: run as non-root for security
USER node

# Copy the minimal runtime produced by Next standalone
# .next/standalone includes the Next server and the trimmed node_modules it needs
COPY --chown=node:node --from=build /app/.next/standalone ./ 
COPY --chown=node:node --from=build /app/.next/static ./.next/static
COPY --chown=node:node --from=build /app/public ./public

EXPOSE 3000
# The standalone server.js is at the container root we just copied to /app
CMD ["node", "server.js"]

########## Dev image (docker compose target=dev) ##########
FROM node:22-alpine AS dev
WORKDIR /app
ENV NODE_ENV=development \
    NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies with cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Copy source code (excludes files in .dockerignore)
COPY . .

# Bind on all interfaces for containerized dev
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]
