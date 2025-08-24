# Multi-stage build for optimized production image
FROM node:20-slim AS base

# Install system dependencies
RUN apt-get update && apt-get install -y \
  python3 \
  make \
  g++ \
  curl \
  unzip \
  && rm -rf /var/lib/apt/lists/*

# Install AWS CLI (smaller installation)
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip awscliv2.zip && \
    ./aws/install && \
    rm -rf awscliv2.zip aws/

# Dependencies stage
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Build stage
FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-slim AS runner
WORKDIR /app

# Install runtime dependencies only
RUN apt-get update && apt-get install -y \
  curl \
  && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --gid 1001 nodejs && \
    useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home tanstack

# Copy built application and production dependencies
COPY --from=deps --chown=tanstack:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=tanstack:nodejs /app/dist ./dist
COPY --from=builder --chown=tanstack:nodejs /app/package.json ./package.json
COPY --from=builder --chown=tanstack:nodejs /app/scripts ./scripts

# Rebuild native dependencies for production
RUN npm rebuild better-sqlite3

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3010
ENV HOSTNAME="0.0.0.0"

# Switch to non-root user
USER tanstack

# Expose port
EXPOSE 3010

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3010/ || exit 1

# Start application
CMD ["npm", "start"]
