'use strict';

// Load .env before anything else
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const http = require('http');
const app = require('./app');
const config = require('./config');
const logger = require('./lib/logger');
const wsServer = require('./websocket/ws-server');

// ─── Background Jobs ──────────────────────────────────────────────────────────
const scheduledOrdersJob = require('./jobs/scheduled-orders.job');
const locationFlushJob   = require('./jobs/location-flush.job');
const cartCleanupJob     = require('./jobs/cart-cleanup.job');

// ─── Create HTTP Server ───────────────────────────────────────────────────────
const server = http.createServer(app);

// ─── Attach WebSocket Server ──────────────────────────────────────────────────
wsServer.init(server);

// ─── Start Listening ──────────────────────────────────────────────────────────
server.listen(config.port, () => {
  logger.info(`Server running on port ${config.port}`, {
    env: config.env,
    redis: config.redis.url ? 'connected' : 'in-memory fallback',
    stripe: config.stripe.enabled ? 'enabled' : 'dummy',
    twilio: config.twilio.enabled ? 'enabled' : 'console fallback',
    email: config.email.enabled ? config.email.provider : 'console fallback',
    firebase: config.firebase.enabled ? 'enabled' : 'disabled',
    sentry: config.sentry.enabled ? 'enabled' : 'disabled',
  });

  // Start background jobs after server is ready
  scheduledOrdersJob.start();
  locationFlushJob.start();
  cartCleanupJob.start();
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
function gracefulShutdown(signal) {
  logger.info(`${signal} received — shutting down gracefully`);

  server.close((err) => {
    if (err) {
      logger.error('Error during server close', { error: err.message });
      process.exit(1);
    }

    logger.info('HTTP server closed');

    // Close Redis connection if open
    const { getRedis } = require('./lib/redis');
    const redis = getRedis();
    if (redis) {
      redis.quit().then(() => {
        logger.info('Redis connection closed');
        process.exit(0);
      }).catch(() => process.exit(0));
    } else {
      process.exit(0);
    }
  });

  // Force exit after 15s if graceful shutdown stalls
  setTimeout(() => {
    logger.error('Graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, 15_000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason: String(reason) });
  process.exit(1);
});

module.exports = server; // Export for testing
