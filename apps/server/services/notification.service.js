'use strict';

const { select } = require('../lib/supabase');
const { sendPushToMultiple } = require('./push.service');
const { sendEmail, refundConfirmationEmail, orderCancellationEmail } = require('./email.service');
const logger = require('../lib/logger');

/**
 * Fetch all push tokens for a user in a project.
 */
async function getUserTokens(userId, projectRef) {
  try {
    const rows = await select('push_tokens', {
      select: 'token',
      filters: { user_id: userId, project_ref: projectRef },
    });
    return (rows || []).map((r) => r.token);
  } catch (err) {
    logger.error('Failed to fetch push tokens', { userId, error: err.message });
    return [];
  }
}

/**
 * Notify vendor when a new order is placed.
 */
async function notifyNewOrder(order, vendorId) {
  const tokens = await getUserTokens(vendorId, order.project_ref);
  if (tokens.length) {
    await sendPushToMultiple({
      tokens,
      title: 'New Order!',
      body: `Order #${order.id.slice(0, 8).toUpperCase()} has been placed`,
      data: { type: 'new_order', orderId: order.id },
    });
  }
}

/**
 * Notify customer when order status changes.
 */
async function notifyOrderStatusChange(order, customerId, statusLabel) {
  if (!customerId) return;
  const tokens = await getUserTokens(customerId, order.project_ref);
  if (tokens.length) {
    await sendPushToMultiple({
      tokens,
      title: 'Order Update',
      body: statusLabel,
      data: { type: 'order_status', orderId: order.id, status: order.status },
    });
  }
}

/**
 * Notify rider when a delivery is assigned.
 */
async function notifyDeliveryAssigned(delivery, riderId, projectRef) {
  const tokens = await getUserTokens(riderId, projectRef);
  if (tokens.length) {
    await sendPushToMultiple({
      tokens,
      title: 'New Delivery',
      body: 'A delivery has been assigned to you',
      data: { type: 'delivery_assigned', deliveryId: delivery.id },
    });
  }
}

/**
 * Notify a user of a new chat message (when they have no active WS connection).
 */
async function notifyNewMessage(recipientId, senderName, conversationId, projectRef) {
  const tokens = await getUserTokens(recipientId, projectRef);
  if (tokens.length) {
    await sendPushToMultiple({
      tokens,
      title: `New message from ${senderName}`,
      body: 'Tap to view',
      data: { type: 'chat_message', conversationId },
    });
  }
}

/**
 * Send refund confirmation email to customer.
 */
async function sendRefundEmail(customerEmail, order, refundAmountCents) {
  if (!customerEmail) return;
  const template = refundConfirmationEmail(order, refundAmountCents);
  await sendEmail({ to: customerEmail, ...template });
}

/**
 * Send order cancellation email to customer.
 */
async function sendCancellationEmail(customerEmail, order, reason) {
  if (!customerEmail) return;
  const template = orderCancellationEmail(order, reason);
  await sendEmail({ to: customerEmail, ...template });
}

/**
 * Notify customer that their order was rejected.
 */
async function notifyOrderRejected(order, customerId) {
  if (!customerId) return;
  const tokens = await getUserTokens(customerId, order.project_ref);
  if (tokens.length) {
    await sendPushToMultiple({
      tokens,
      title: 'Order Rejected',
      body: 'Your order was rejected by the restaurant',
      data: { type: 'order_rejected', orderId: order.id },
    });
  }
}

/**
 * Notify customer that their rider has arrived.
 */
async function notifyRiderArrived(delivery, orderId, projectRef) {
  const orderModel = require('../models/order.model');
  const order = await orderModel.findById(orderId);
  if (!order?.customer_id) return;
  const tokens = await getUserTokens(order.customer_id, projectRef);
  if (tokens.length) {
    await sendPushToMultiple({
      tokens,
      title: 'Rider Arrived',
      body: 'Your rider has arrived!',
      data: { type: 'rider_arrived', deliveryId: delivery.id, orderId },
    });
  }
}

/**
 * Notify customer that their order has been completed.
 */
async function notifyOrderCompleted(order, customerId) {
  if (!customerId) return;
  const tokens = await getUserTokens(customerId, order.project_ref);
  if (tokens.length) {
    await sendPushToMultiple({
      tokens,
      title: 'Order Delivered',
      body: 'Your order has been delivered! Rate your experience',
      data: { type: 'order_completed', orderId: order.id },
    });
  }
}

/**
 * Notify riders of a new delivery request.
 */
async function notifyDeliveryRequest(delivery, riderId, projectRef) {
  const tokens = await getUserTokens(riderId, projectRef);
  if (tokens.length) {
    await sendPushToMultiple({
      tokens,
      title: 'New Delivery Available',
      body: 'New delivery available near you',
      data: { type: 'delivery_request', deliveryId: delivery.id },
    });
  }
}

module.exports = {
  notifyNewOrder,
  notifyOrderStatusChange,
  notifyDeliveryAssigned,
  notifyNewMessage,
  sendRefundEmail,
  sendCancellationEmail,
  notifyOrderRejected,
  notifyRiderArrived,
  notifyOrderCompleted,
  notifyDeliveryRequest,
};
