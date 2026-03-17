# ─── Stage 1: Build frontend ──────────────────────────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /app

COPY package*.json ./
RUN npm ci --include=dev

COPY . .
RUN npm run build

# ─── Stage 2: Production server ───────────────────────────────────────────────
FROM node:20-alpine AS production

# Security: run as non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S delivio -u 1001

WORKDIR /app

# Copy backend dependencies only
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production && cd ..

# Copy built frontend and server source
COPY --from=frontend-build /app/dist ./dist
COPY --chown=delivio:nodejs server ./server

USER delivio

EXPOSE 8080

ENV NODE_ENV=production
ENV PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

CMD ["node", "server/index.js"]
