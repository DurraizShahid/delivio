'use strict';

const logger = require('../lib/logger');
const config = require('../config');

/**
 * 404 handler — must be registered AFTER all routes.
 */
function notFound(req, res) {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
}

/**
 * Global error handler — must be registered last with 4 params.
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const statusCode = err.statusCode || err.status || 500;
  const isOperational = err.isOperational || statusCode < 500;

  logger.error('Request error', {
    method: req.method,
    path: req.path,
    statusCode,
    message: err.message,
    stack: config.isProd ? undefined : err.stack,
  });

  const body = {
    error: isOperational ? err.message : 'An unexpected error occurred',
  };

  if (!config.isProd && err.stack) {
    body.stack = err.stack;
  }

  res.status(statusCode).json(body);
}

/**
 * Create an operational error with a specific HTTP status code.
 */
function createError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.isOperational = true;
  return err;
}

module.exports = { notFound, errorHandler, createError };
