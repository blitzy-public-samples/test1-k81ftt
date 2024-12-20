# ---- Build Stage ----
FROM node:20-alpine AS builder

# Build arguments
ARG NODE_ENV=production
ARG PNPM_VERSION=8.0.0

# Set working directory
WORKDIR /app

# Install build dependencies and pnpm
RUN apk add --no-cache python3 make g++ curl \
    && npm install -g pnpm@${PNPM_VERSION} \
    && addgroup -g 1000 node \
    && adduser -u 1000 -G node -s /bin/sh -D node

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install all dependencies (including devDependencies)
RUN pnpm install --frozen-lockfile

# Copy source code and config files
COPY tsconfig.json ./
COPY src/ ./src/

# Generate Prisma client
RUN pnpm prisma generate

# Build TypeScript code
RUN pnpm run build

# Prune development dependencies
RUN pnpm prune --prod

# ---- Production Stage ----
FROM node:20-alpine

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000
ENV TZ=UTC

# Set working directory
WORKDIR /app

# Create non-root user and set ownership
RUN addgroup -g 1000 node \
    && adduser -u 1000 -G node -s /bin/sh -D node \
    && chown -R node:node /app

# Install runtime dependencies
RUN apk add --no-cache curl tzdata

# Copy built artifacts and dependencies from builder
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./

# Security hardening
RUN chmod -R 550 /app/dist \
    && chmod -R 550 /app/node_modules \
    && chmod 550 /app/package.json

# Create and configure volumes
VOLUME ["/tmp"]

# Switch to non-root user
USER node

# Expose application port
EXPOSE 3000

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Security configurations
# Drop all capabilities and only add necessary ones
RUN setcap 'cap_net_bind_service=+ep' /usr/local/bin/node

# Set read-only root filesystem
RUN chmod 550 /app

# Set entry point
ENTRYPOINT ["node", "dist/server.js"]

# Labels for container metadata
LABEL maintainer="Task Management Team" \
    version="1.0.0" \
    description="Enterprise-grade backend microservices for task management system" \
    org.opencontainers.image.source="https://github.com/organization/task-management"