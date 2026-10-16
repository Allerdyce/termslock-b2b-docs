# syntax=docker/dockerfile:1
FROM node:22-alpine AS base

WORKDIR /app

# Install dependencies required for building & running
ENV NODE_ENV=production
ENV PORT=3456

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY tsconfig.json ./
COPY extensions ./extensions
COPY web ./web
COPY src ./src

EXPOSE 3456

USER node

CMD ["node", "src/server.ts"]
