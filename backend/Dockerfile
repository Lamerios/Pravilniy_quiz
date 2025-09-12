# Backend Dockerfile (multi-stage)

FROM node:20-alpine AS deps
WORKDIR /usr/src/app/backend

# Install dependencies based on backend/package-lock.json for reproducible builds
COPY backend/package*.json ./
RUN npm ci

FROM deps AS builder
WORKDIR /usr/src/app/backend
COPY backend/tsconfig.json ./
COPY backend/src ./src
# Copy shared types used by backend to match relative imports '../../../shared/...'
RUN mkdir -p /usr/src/app/shared
COPY shared /usr/src/app/shared
RUN npm run build

FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /usr/src/app/backend

# Copy only production deps for backend
COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# App artifacts
COPY --from=builder /usr/src/app/backend/dist ./dist

# Create directories used by the app (mounted as volumes in compose)
RUN mkdir -p /usr/src/uploads /usr/src/logs

EXPOSE 5001

# Use absolute paths for uploads/logs inside container
ENV HOST=0.0.0.0 \
    BACKEND_PORT=5001 \
    UPLOAD_PATH=/usr/src/uploads \
    LOG_PATH=/usr/src/logs

CMD ["node", "dist/server.js"]


