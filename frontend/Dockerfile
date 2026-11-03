# ----------------------------------------------------
# Approval Hub - Frontend Dockerfile
# Multi-stage build for Vite React SPA + Nginx
# ----------------------------------------------------

# Stage 1: Build React SPA
FROM node:20-alpine AS builder
WORKDIR /app

# Build argument for API base URL (baked into Vite bundle)
ARG VITE_API_URL=/approval_hub
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json tsconfig*.json vite.config.ts index.html ./
RUN npm ci

COPY src/ ./src
COPY public/ ./public

RUN npm run build

# Stage 2: Nginx Web Server
FROM nginx:alpine AS runner

# Remove default nginx configurations
RUN rm -rf /etc/nginx/conf.d/*

COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy Vite build output into Nginx subpath directory
COPY --from=builder /app/dist /usr/share/nginx/html/approval_hub

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

