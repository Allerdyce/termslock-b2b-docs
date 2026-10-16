# syntax=docker/dockerfile:1
# Multi-stage Dockerfile for TermsLock: B2B PO, Tax & Net-30 Checkout Rules
# Compatible with Fly.io, Railway, and standard OCI container runtimes

# 1. Builder Stage: Build Wasm targets & bundle in-memory static assets
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY extensions ./extensions
COPY web ./web
COPY scripts ./scripts
COPY src ./src

# Compile Wasm targets and pre-bundle dist/polaris.css, dist/app.bundle.js, and src/assets/embedded-assets.ts
RUN npm run build

# 2. Production Runner Stage: Lean runtime with zero ENOENT risk
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3456

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY tsconfig.json ./
COPY extensions ./extensions
COPY web ./web
COPY src ./src
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/assets ./src/assets

EXPOSE 3456

USER node

CMD ["node", "src/server.ts"]
