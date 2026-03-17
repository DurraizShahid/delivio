FROM node:20-alpine

# Security: run as non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S delivio -u 1001

WORKDIR /app

# Install backend dependencies (Turborepo: apps/server)
COPY apps/server/package*.json ./apps/server/
RUN cd apps/server && npm ci --only=production

# Copy backend source
COPY --chown=delivio:nodejs apps/server ./apps/server

USER delivio

EXPOSE 8080

ENV NODE_ENV=production
ENV PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

CMD ["node", "apps/server/index.js"]
