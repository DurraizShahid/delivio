'use strict';

const config = require('../config');
const logger = require('../lib/logger');

let _stripe = null;

function getStripe() {
  if (_stripe) return _stripe;
  if (!config.stripe.enabled) return null;
  _stripe = require('stripe')(config.stripe.secretKey);
  return _stripe;
}

/**
 * Create a Stripe PaymentIntent.
 * Returns a dummy response when Stripe is not configured.
 */
async function createPaymentIntent(amountCents, currency = 'gbp', metadata = {}) {
  const stripe = getStripe();

  if (!stripe) {
    logger.warn('[STRIPE FALLBACK] Dummy PaymentIntent created', { amountCents });
    return {
      clientSecret: `dummy_secret_${Date.now()}`,
      paymentIntentId: `pi_dummy_${Date.now()}`,
      isDummy: true,
    };
  }

  const intent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency,
    metadata,
    automatic_payment_methods: { enabled: true },
  });

  return {
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id,
    isDummy: false,
  };
}

/**
 * Create a full or partial refund.
 */
async function createRefund(paymentIntentId, amountCents) {
  const stripe = getStripe();
  if (!stripe) {
    logger.warn('[STRIPE FALLBACK] Dummy refund created', { paymentIntentId });
    return { id: `re_dummy_${Date.now()}`, status: 'succeeded' };
  }

  const params = { payment_intent: paymentIntentId };
  if (amountCents) params.amount = amountCents;

  return stripe.refunds.create(params);
}

/**
 * Retrieve a PaymentIntent by ID.
 */
async function getPaymentIntent(paymentIntentId) {
  const stripe = getStripe();
  if (!stripe) return null;
  return stripe.paymentIntents.retrieve(paymentIntentId);
}

/**
 * Verify a Stripe webhook signature and return the event.
 * Throws if signature is invalid.
 */
function constructWebhookEvent(rawBody, signature) {
  const stripe = getStripe();
  if (!stripe || !config.stripe.webhookSecret) {
    throw new Error('Stripe webhook verification not configured');
  }
  return stripe.webhooks.constructEvent(rawBody, signature, config.stripe.webhookSecret);
}

module.exports = { createPaymentIntent, createRefund, getPaymentIntent, constructWebhookEvent };
