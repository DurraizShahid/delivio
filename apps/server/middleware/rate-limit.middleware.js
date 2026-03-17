'use strict';

const rateLimit = require('express-rate-limit');
const config = require('../config');

const defaultHandler = (req, res) => {
  res.status(429).json({
    error: 'Too many requests, please try again later.',
    retryAfter: res.getHeader('Retry-After'),
  });
};

/**
 * Global rate limiter — 100 req/min per IP across all /api/* routes.
 */
const globalLimiter = rateLimit({
  windowMs: config.rateLimit.global.windowMs,
  max: config.rateLimit.global.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: defaultHandler,
});

/**
 * Auth route limiter — 20 req/min per IP.
 */
const authLimiter = rateLimit({
  windowMs: config.rateLimit.auth.windowMs,
  max: config.rateLimit.auth.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: defaultHandler,
});

/**
 * Payment route limiter — 30 req/min per IP.
 */
const paymentLimiter = rateLimit({
  windowMs: config.rateLimit.payments.windowMs,
  max: config.rateLimit.payments.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: defaultHandler,
});

/**
 * OTP send limiter — uses phone number as key (custom key generator).
 * 3 requests per phone per 15 minutes.
 */
const otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => req.body?.phone || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  handler: defaultHandler,
});

module.exports = { globalLimiter, authLimiter, paymentLimiter, otpSendLimiter };
