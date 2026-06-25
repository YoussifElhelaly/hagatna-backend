# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:18 AS builder

WORKDIR /app

# Skip husky during npm ci
ENV HUSKY=0

# Install dependencies (layer cache)
COPY package*.json ./
RUN npm ci --include=dev --ignore-scripts

# Copy source and prisma schema
COPY tsconfig.json ./
COPY src ./src
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript → JavaScript (tsc + tsc-alias for path aliases)
RUN npm run build

# ─── Stage 2: Production Image ────────────────────────────────────────────────
FROM node:18 AS production

WORKDIR /app

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
RUN mkdir -p logs

EXPOSE 5000

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

ENTRYPOINT ["node"]
CMD ["dist/server.js"]
