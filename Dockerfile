# ── Stage 1: Dependencies ─────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files only — this layer is cached unless packages change
COPY package*.json ./

RUN npm ci --frozen-lockfile

# ── Stage 2: Builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Compile TypeScript to JavaScript
RUN npm run build

# ── Stage 3: Runner ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 authserver

# Copy only production dependencies
COPY package*.json ./
RUN npm ci --frozen-lockfile --only=production

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Switch to non-root user
USER authserver

EXPOSE 3000

# Health check — Docker will mark container unhealthy if this fails
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/auth/health || exit 1

CMD ["node", "dist/server.js"]