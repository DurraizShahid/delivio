'use strict';

const orderModel = require('../models/order.model');
const deliveryModel = require('../models/delivery.model');
const userModel = require('../models/user.model');
const vendorSettingsModel = require('../models/vendor-settings.model');
const { createRefund } = require('../services/stripe.service');
const notificationService = require('../services/notification.service');
const wsServer = require('../websocket/ws-server');
const { writeAuditLog } = require('../lib/audit');
const { createError } = require('../middleware/error.middleware');
const { getCallerId, getCallerRole } = require('../middleware/auth.middleware');
const customerModel = require('../models/customer.model');
const logger = require('../lib/logger');

const statusMessages = {
  accepted: 'Your order has been accepted!',
  rejected: 'Your order was rejected by the restaurant',
  preparing: 'Your order is being prepared',
  ready: 'Your order is ready for pickup',
  assigned: 'A rider has been assigned to your order',
  picked_up: 'Your order is on the way!',
  arrived: 'Your rider has arrived!',
  completed: 'Your order has been delivered',
  cancelled: 'Your order has been cancelled',
};

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

    // Include delivery and vendor for rating/tip UI
    const [delivery, vendorUsers] = await Promise.all([
      deliveryModel.findByOrderId(req.params.id),
      userModel.findByProjectRef(order.project_ref, 'vendor'),
    ]);
    const orderResponse = { ...order };
    if (delivery) {
      orderResponse.delivery = {
        id: delivery.id,
        riderId: delivery.rider_id,
        status: delivery.status,
      };
    }
    if (vendorUsers?.length) {
      orderResponse.vendorId = vendorUsers[0].id;
    }

    return res.json({ order: orderResponse });
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
    wsServer.broadcast(req.projectRef, {
      type: 'order:status_changed',
      orderId: order.id,
      status: order.status,
      previousStatus: null,
      updatedAt: order.updated_at,
    });

    // Auto-accept if vendor setting enabled
    try {
      const settings = await vendorSettingsModel.findByProjectRef(req.projectRef);
      if (settings?.auto_accept && order.status === 'placed') {
        const prepTime = settings.default_prep_time_minutes || 20;
        await orderModel.updateStatus(order.id, 'accepted');
        await orderModel.setSlaDeadline(order.id, prepTime);

        wsServer.broadcast(req.projectRef, {
          type: 'order:status_changed',
          orderId: order.id,
          status: 'accepted',
          previousStatus: 'placed',
          updatedAt: new Date().toISOString(),
        });

        if (customerId) {
          await notificationService.notifyOrderStatusChange(
            order, customerId, `Your order has been auto-accepted! ETA: ${prepTime} minutes`
          );
        }
      }
    } catch (autoAcceptErr) {
      logger.error('Auto-accept failed', { orderId: order.id, error: autoAcceptErr.message });
    }

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
    orderModel.validateTransition(previousStatus, status);
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

// ─── Reject Order ────────────────────────────────────────────────────────────

async function rejectOrder(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await orderModel.findById(id);
    if (!order) return next(createError('Order not found', 404));
    if (order.project_ref !== req.projectRef) return next(createError('Access denied', 403));

    await orderModel.reject(id, reason);
    const updatedOrder = await orderModel.findById(id);

    wsServer.broadcast(req.projectRef, {
      type: 'order:rejected',
      orderId: id,
      reason: reason || null,
      updatedAt: updatedOrder.updated_at,
    });

    if (order.customer_id) {
      await notificationService.notifyOrderStatusChange(
        updatedOrder, order.customer_id, statusMessages.rejected
      );
    }

    await writeAuditLog({
      userId: getCallerId(req),
      action: 'order.rejected',
      resourceType: 'order',
      resourceId: id,
      details: { reason },
      ip: req.ip,
    });

    return res.json({ order: updatedOrder });
  } catch (err) {
    next(err);
  }
}

// ─── Accept Order ────────────────────────────────────────────────────────────

async function acceptOrder(req, res, next) {
  try {
    const { id } = req.params;
    const { prepTimeMinutes } = req.body;

    const order = await orderModel.findById(id);
    if (!order) return next(createError('Order not found', 404));
    if (order.project_ref !== req.projectRef) return next(createError('Access denied', 403));
    if (order.status !== 'placed') {
      return next(createError(`Cannot accept order with status: ${order.status}`, 400));
    }

    orderModel.validateTransition('placed', 'accepted');
    await orderModel.updateStatus(id, 'accepted');

    const settings = await vendorSettingsModel.findByProjectRef(req.projectRef);
    const prepTime = prepTimeMinutes || settings?.default_prep_time_minutes || 20;
    await orderModel.setSlaDeadline(id, prepTime);

    const updatedOrder = await orderModel.findById(id);

    wsServer.broadcast(req.projectRef, {
      type: 'order:status_changed',
      orderId: id,
      status: 'accepted',
      previousStatus: 'placed',
      updatedAt: updatedOrder.updated_at,
    });

    if (order.customer_id) {
      await notificationService.notifyOrderStatusChange(
        updatedOrder, order.customer_id, `Your order has been accepted! ETA: ${prepTime} minutes`
      );
    }

    await writeAuditLog({
      userId: getCallerId(req),
      action: 'order.accepted',
      resourceType: 'order',
      resourceId: id,
      details: { prepTimeMinutes: prepTime },
      ip: req.ip,
    });

    return res.json({ order: updatedOrder });
  } catch (err) {
    next(err);
  }
}

// ─── Complete Order ──────────────────────────────────────────────────────────

async function completeOrder(req, res, next) {
  try {
    const { id } = req.params;

    const order = await orderModel.findById(id);
    if (!order) return next(createError('Order not found', 404));
    if (order.project_ref !== req.projectRef) return next(createError('Access denied', 403));

    const delivery = await deliveryModel.findByOrderId(id);
    if (!delivery) return next(createError('No delivery found for this order', 400));
    if (delivery.status !== 'arrived') {
      return next(createError(`Cannot complete order — delivery status is: ${delivery.status}`, 400));
    }

    await deliveryModel.updateStatus(delivery.id, 'delivered');
    await orderModel.updateStatus(id, 'completed');

    const updatedOrder = await orderModel.findById(id);

    wsServer.broadcast(req.projectRef, {
      type: 'order:status_changed',
      orderId: id,
      status: 'completed',
      previousStatus: order.status,
      updatedAt: updatedOrder.updated_at,
    });

    if (order.customer_id) {
      await notificationService.notifyOrderStatusChange(
        updatedOrder, order.customer_id, 'Your order has been delivered! Rate your experience'
      );
    }

    await writeAuditLog({
      userId: getCallerId(req),
      action: 'order.completed',
      resourceType: 'order',
      resourceId: id,
      details: { deliveryId: delivery.id },
      ip: req.ip,
    });

    return res.json({ order: updatedOrder });
  } catch (err) {
    next(err);
  }
}

// ─── Extend SLA Deadline ─────────────────────────────────────────────────────

async function extendSla(req, res, next) {
  try {
    const { id } = req.params;
    const { additionalMinutes } = req.body;

    const order = await orderModel.findById(id);
    if (!order) return next(createError('Order not found', 404));
    if (order.project_ref !== req.projectRef) return next(createError('Access denied', 403));
    if (!['accepted', 'preparing'].includes(order.status)) {
      return next(createError('Can only extend SLA for accepted or preparing orders', 400));
    }

    const minutes = additionalMinutes || 10;
    const newDeadline = new Date(
      order.sla_deadline ? new Date(order.sla_deadline).getTime() + minutes * 60000
      : Date.now() + minutes * 60000
    ).toISOString();

    const { update } = require('../lib/supabase');
    await update('orders', {
      sla_deadline: newDeadline,
      sla_breached: false,
      updated_at: new Date().toISOString(),
    }, { id });

    wsServer.broadcast(req.projectRef, {
      type: 'order:status_changed',
      orderId: id,
      status: order.status,
      previousStatus: order.status,
      updatedAt: new Date().toISOString(),
    });

    if (order.customer_id) {
      await notificationService.notifyOrderStatusChange(
        order, order.customer_id, `Preparation time extended by ${minutes} minutes`
      );
    }

    return res.json({ ok: true, newDeadline });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  refundOrder,
  cancelOrder,
  rejectOrder,
  acceptOrder,
  completeOrder,
  extendSla,
};
