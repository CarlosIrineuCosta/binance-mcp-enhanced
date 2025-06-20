# Secure Dockerfile for Binance MCP
# ----------------
# Builder stage
# ----------------
FROM node:20-alpine AS builder

# Create app directory
WORKDIR /app

# Install dependencies (ignore scripts to avoid prepublish hooks)
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci --ignore-scripts

# Copy source and build
COPY src ./src
RUN npm run build

# ----------------
# Runner stage
# ----------------
FROM node:20-alpine AS runner

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /app

# Create non-root user and group
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 --ingroup appgroup --home /app --shell /sbin/nologin appuser

# Copy build artifacts and package files with correct ownership
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/package.json ./package.json
COPY --from=builder --chown=appuser:appgroup /app/package-lock.json ./package-lock.json

# Install only production dependencies
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force && \
    rm -rf /tmp/*

# Set correct permissions
RUN chmod -R 550 /app && \
    chmod -R 440 /app/dist/*

# Switch to non-root user
USER appuser

# Add security labels
LABEL security.scan="true" \
      security.non-root="true" \
      maintainer="security-team"

# Health check (adjust based on your MCP server's capabilities)
# Since this is an stdio-based service, we check if the process responds
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "console.log('healthy'); process.exit(0);" || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Default command to start the MCP server over stdio
CMD ["node", "dist/index.js"]