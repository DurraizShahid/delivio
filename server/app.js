'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const config = require('./config');
const corsOptions = require('./config/cors');
const helmetOptions = require('./config/helmet');
const logger = require('./lib/logger');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error.middleware');

const app = express();

// ─── Trust Proxy ──────────────────────────────────────────────────────────────
// Required when behind Vercel/Railway/nginx to get real client IPs for rate limiting
if (config.isProd) {
  app.set('trust proxy', 1);
}

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use(helmet(helmetOptions));

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight

// ─── Request Logging ──────────────────────────────────────────────────────────
app.use(
  morgan(config.isProd ? 'combined' : 'dev', {
    stream: { write: (msg) => logger.http(msg.trim()) },
    skip: (req) => req.path === '/api/health', // Don't log health checks
  })
);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
// NOTE: The Stripe webhook route uses express.raw() — it is mounted BEFORE these parsers
// in payment.routes.js to preserve the raw body for signature verification.
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser(config.session.secret));

// ─── Sentry Request Handler (before routes) ───────────────────────────────────
if (config.sentry.enabled) {
  const Sentry = require('@sentry/node');
  Sentry.init({
    dsn: config.sentry.dsn,
    environment: config.env,
    tracesSampleRate: config.isProd ? 0.1 : 1.0,
  });
  app.use(Sentry.Handlers.requestHandler());
  logger.info('Sentry: request handler registered');
}

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api', routes);

// ─── Sentry Error Handler (before global error handler) ───────────────────────
if (config.sentry.enabled) {
  const Sentry = require('@sentry/node');
  app.use(Sentry.Handlers.errorHandler());
}

// ─── 404 + Global Error Handler (must be last) ────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
