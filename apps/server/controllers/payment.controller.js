'use strict';

const { createPaymentIntent, constructWebhookEvent } = require('../services/stripe.service');
const orderModel = require('../models/order.model');
const stripeEventModel = require('../models/stripe-event.model');
const notificationService = require('../services/notification.service');
const wsServer = require('../websocket/ws-server');
const { writeAuditLog } = require('../lib/audit');
const logger = require('../lib/logger');

async function createIntent(req, res, next) {
  try {
    const { amountCents, currency, metadata } = req.body;
    const result = await createPaymentIntent(amountCents, currency, {
      ...metadata,
      projectRef: req.projectRef,
    });
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * Stripe webhook handler.
 * MUST receive raw body — see app.js for rawBodyMiddleware applied to this route.
 * Order creation happens HERE and only here — never from the frontend.
 */
async function stripeWebhook(req, res, next) {
  try {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = constructWebhookEvent(req.rawBody, sig);
    } catch (err) {
      logger.warn('Stripe webhook signature verification failed', { error: err.message });
      return res.status(400).json({ error: 'Webhook signature verification failed' });
    }

    // Idempotency: Stripe may retry events; ensure we only process once.
    const isNew = await stripeEventModel.recordOnce({ eventId: event.id, type: event.type });
    if (!isNew) {
      logger.info('Stripe webhook duplicate ignored', { type: event.type, eventId: event.id });
      return res.json({ received: true, duplicate: true });
    }

    logger.info('Stripe webhook received', { type: event.type, eventId: event.id });

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object;
        const { projectRef, customerId, items, totalCents, scheduledFor } = intent.metadata;

        if (!projectRef) {
          logger.warn('Stripe webhook: missing projectRef in metadata', { intentId: intent.id });
          break;
        }

        const order = await orderModel.createWithItems({
          projectRef,
          customerId: customerId || null,
          items: items ? JSON.parse(items) : [],
          totalCents: parseInt(totalCents || intent.amount, 10),
          paymentIntentId: intent.id,
          scheduledFor: scheduledFor || null,
        });

        wsServer.broadcast(projectRef, {
          type: 'order:status_changed',
          orderId: order.id,
          status: order.status,
          previousStatus: null,
          updatedAt: order.created_at,
        });

        await writeAuditLog({
          action: 'payment.succeeded',
          resourceType: 'order',
          resourceId: order.id,
          details: { paymentIntentId: intent.id },
        });
        break;
      }

      case 'payment_intent.payment_failed': {
        const intent = event.data.object;
        logger.warn('Payment failed', { intentId: intent.id });
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        logger.info('Charge refunded', { chargeId: charge.id });
        break;
      }

      default:
        logger.debug('Stripe webhook: unhandled event type', { type: event.type });
    }

    return res.json({ received: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { createIntent, stripeWebhook };
