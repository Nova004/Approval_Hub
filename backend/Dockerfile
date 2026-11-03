# ----------------------------------------------------
# Approval Hub - Backend Dockerfile
# Multi-stage build for TypeScript Node.js Express API
# ----------------------------------------------------

# Stage 1: Build TypeScript
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src/ ./src
RUN npm run build

# Stage 2: Production Runtime
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3002

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled JavaScript files from builder
COPY --from=builder /app/dist ./dist

# Run as non-root user
USER node

EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3002/health || exit 1

CMD ["node", "dist/app.js"]

