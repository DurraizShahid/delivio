'use strict';

const { Router } = require('express');
const express = require('express');
const paymentController = require('../controllers/payment.controller');
const { validate } = require('../middleware/validate.middleware');
const { parseSession, requireAnyAuth } = require('../middleware/auth.middleware');
const { attachProjectRef } = require('../middleware/project-ref.middleware');
const { paymentLimiter } = require('../middleware/rate-limit.middleware');
const { createIntentSchema } = require('../validators/payment.validator');

const router = Router();

// Stripe webhook MUST use raw body — registered before express.json() in app.js
// This route is mounted at /api/webhooks/stripe in the main router
router.post(
  '/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  (req, res, next) => {
    req.rawBody = req.body;
    next();
  },
  paymentController.stripeWebhook
);

// Standard payment routes
router.post(
  '/payments/create-intent',
  paymentLimiter,
  parseSession,
  requireAnyAuth,
  attachProjectRef,
  validate(createIntentSchema),
  paymentController.createIntent
);

module.exports = router;
