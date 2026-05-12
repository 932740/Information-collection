# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend
FROM node:20 AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install
COPY backend/ ./
RUN npm run build

# Stage 3: Runtime
FROM ubuntu:22.04
ENV DEBIAN_FRONTEND=noninteractive

# Install Node.js 20
RUN apt-get update && apt-get install -y curl ca-certificates && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

# Install Python 3.11
RUN apt-get install -y python3.11 python3.11-venv curl && \
    curl -sS https://bootstrap.pypa.io/get-pip.py | python3.11

# Install supervisord
RUN apt-get install -y supervisor

# Install build tools for rebuilding sqlite3
RUN apt-get install -y python3 make g++ libsqlite3-dev

WORKDIR /app

# Copy backend
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder /app/backend/package.json ./backend/package.json

# Rebuild sqlite3 native module for Ubuntu glibc
RUN cd /app/backend && npm rebuild sqlite3

# Copy frontend
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Copy ai-service
COPY ai-service/requirements.txt ./ai-service/requirements.txt
COPY ai-service/main.py ./ai-service/main.py
RUN python3.11 -m pip install -r ./ai-service/requirements.txt

# Copy supervisord config
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Create data directories
RUN mkdir -p /app/data/templates /app/data/exports/temp /app/logs

EXPOSE 3000

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
