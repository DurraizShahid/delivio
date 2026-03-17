'use strict';

const orderModel = require('../models/order.model');
const { createRefund } = require('../services/stripe.service');
const notificationService = require('../services/notification.service');
const wsServer = require('../websocket/ws-server');
const { writeAuditLog } = require('../lib/audit');
const { createError } = require('../middleware/error.middleware');
const { getCallerId, getCallerRole } = require('../middleware/auth.middleware');
const customerModel = require('../models/customer.model');

// ─── List Orders ──────────────────────────────────────────────────────────────

async function listOrders(req, res, next) {
  try {
    const { status, customerId, limit, offset } = req.query;
    const orders = await orderModel.findByProjectRef(req.projectRef, { status, customerId, limit, offset });
    return res.json({ orders });
  } catch (err) {
    next(err);
  }
}

// ─── Get Order ────────────────────────────────────────────────────────────────

async function getOrder(req, res, next) {
  try {
    const order = await orderModel.findWithItems(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.project_ref !== req.projectRef) return res.status(403).json({ error: 'Access denied' });
    return res.json({ order });
  } catch (err) {
    next(err);
  }
}

// ─── Create Order (internal — called from Stripe webhook) ────────────────────

async function createOrder(req, res, next) {
  try {
    const { items, totalCents, paymentIntentId, scheduledFor, customerId } = req.body;

    const order = await orderModel.createWithItems({
      projectRef: req.projectRef,
      customerId,
      items,
      totalCents,
      paymentIntentId,
      scheduledFor,
    });

    // Notify vendor of new order
    // Vendor lookup would happen here via workspace config; simplified for now
    wsServer.broadcast(req.projectRef, {
      type: 'order:status_changed',
      orderId: order.id,
      status: order.status,
      previousStatus: null,
      updatedAt: order.updated_at,
    });

    return res.status(201).json({ order });
  } catch (err) {
    next(err);
  }
}

// ─── Update Order Status ──────────────────────────────────────────────────────

async function updateOrderStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await orderModel.findById(id);
    if (!order) return next(createError('Order not found', 404));
    if (order.project_ref !== req.projectRef) return next(createError('Access denied', 403));

    const previousStatus = order.status;
    await orderModel.updateStatus(id, status);

    const updatedOrder = await orderModel.findById(id);

    // Broadcast real-time update
    wsServer.broadcast(req.projectRef, {
      type: 'order:status_changed',
      orderId: id,
      status,
      previousStatus,
      updatedAt: updatedOrder.updated_at,
    });

    // Push notification to customer
    if (order.customer_id) {
      const statusMessages = {
        accepted_by_vendor: 'Your order has been accepted!',
        preparing: 'Your order is being prepared',
        ready: 'Your order is ready for pickup',
        picked_up: 'Your order is on the way!',
        delivered: 'Your order has been delivered',
        cancelled: 'Your order has been cancelled',
      };
      const msg = statusMessages[status];
      if (msg) {
        await notificationService.notifyOrderStatusChange(order, order.customer_id, msg);
      }
    }

    await writeAuditLog({
      userId: getCallerId(req),
      action: 'order.status_changed',
      resourceType: 'order',
      resourceId: id,
      details: { from: previousStatus, to: status },
      ip: req.ip,
    });

    return res.json({ order: updatedOrder });
  } catch (err) {
    next(err);
  }
}

// ─── Refund ───────────────────────────────────────────────────────────────────

async function refundOrder(req, res, next) {
  try {
    const { id } = req.params;
    const { amountCents, reason } = req.body;

    const order = await orderModel.findWithItems(id);
    if (!order) return next(createError('Order not found', 404));
    if (order.project_ref !== req.projectRef) return next(createError('Access denied', 403));
    if (order.payment_status !== 'paid') {
      return next(createError('Order has not been paid or is already refunded', 400));
    }

    const refundAmount = amountCents || order.total_cents;
    const isPartial = !!amountCents && amountCents < order.total_cents;

    await createRefund(order.payment_intent_id, amountCents);
    await orderModel.applyRefund(id, { amountCents: refundAmount, reason, isPartial });

    // Email customer
    if (order.customer_id) {
      const customer = await customerModel.findById(order.customer_id);
      if (customer?.email) {
        await notificationService.sendRefundEmail(customer.email, order, refundAmount);
      }
    }

    await writeAuditLog({
      userId: getCallerId(req),
      action: 'payment.refunded',
      resourceType: 'order',
      resourceId: id,
      details: { amountCents: refundAmount, reason },
      ip: req.ip,
    });

    return res.json({ ok: true, refundAmount });
  } catch (err) {
    next(err);
  }
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

async function cancelOrder(req, res, next) {
  try {
    const { id } = req.params;
    const { reason, initiator } = req.body;

    const order = await orderModel.findWithItems(id);
    if (!order) return next(createError('Order not found', 404));
    if (order.project_ref !== req.projectRef) return next(createError('Access denied', 403));
    if (!orderModel.isCancellable(order)) {
      return next(createError(`Cannot cancel order with status: ${order.status}`, 400));
    }

    await orderModel.cancel(id, { reason, initiator });

    // Auto-refund if already paid
    if (order.payment_status === 'paid' && order.payment_intent_id) {
      await createRefund(order.payment_intent_id);
      await orderModel.applyRefund(id, { amountCents: order.total_cents, reason: 'Order cancelled', isPartial: false });
    }

    // Notify customer
    if (order.customer_id) {
      const customer = await customerModel.findById(order.customer_id);
      if (customer?.email) {
        await notificationService.sendCancellationEmail(customer.email, order, reason);
      }
    }

    wsServer.broadcast(req.projectRef, {
      type: 'order:status_changed',
      orderId: id,
      status: 'cancelled',
      previousStatus: order.status,
      updatedAt: new Date().toISOString(),
    });

    await writeAuditLog({
      userId: getCallerId(req),
      action: 'order.cancelled',
      resourceType: 'order',
      resourceId: id,
      details: { reason, initiator },
      ip: req.ip,
    });

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { listOrders, getOrder, createOrder, updateOrderStatus, refundOrder, cancelOrder };
