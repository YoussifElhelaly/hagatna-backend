# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Install OpenSSL (required by Prisma schema engine)
RUN apk add --no-cache openssl openssl-dev

# Install dependencies (skip husky prepare script)
ENV HUSKY=0
COPY package*.json ./
RUN npm ci --include=dev --ignore-scripts && npm ls

# Copy source and prisma schema
COPY tsconfig.json ./
COPY src ./src
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript → JavaScript (tsc + tsc-alias for path aliases)
RUN npm run build

# ─── Stage 2: Production Image ────────────────────────────────────────────────
FROM node:18-alpine AS production

WORKDIR /app

# Install OpenSSL + dumb-init for proper signal handling
RUN apk add --no-cache dumb-init openssl

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Skip husky during npm ci
ENV HUSKY=0

# Copy production dependencies only (skip husky prepare script)
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy built output from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy prisma schema (needed for migrations at runtime)
COPY --from=builder /app/prisma ./prisma

# Create logs directory with correct permissions
RUN mkdir -p logs && chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 5000

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
