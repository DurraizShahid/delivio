'use strict';

const deliveryModel = require('../models/delivery.model');
const sessionService = require('../services/session.service');
const notificationService = require('../services/notification.service');
const wsServer = require('../websocket/ws-server');
const { writeAuditLog } = require('../lib/audit');
const { createError } = require('../middleware/error.middleware');

async function listDeliveries(req, res, next) {
  try {
    const riderId = req.user.id;
    const { zoneId, status } = req.query;
    if (status === 'pending') {
      const deliveries = await deliveryModel.findAvailable(req.projectRef);
      return res.json({ deliveries: deliveries || [] });
    }
    const deliveries = await deliveryModel.findForRider(riderId, zoneId, status);
    return res.json({ deliveries });
  } catch (err) {
    next(err);
  }
}

async function claimDelivery(req, res, next) {
  try {
    const { id } = req.params;
    const riderId = req.user.id;

    const delivery = await deliveryModel.findById(id);
    if (!delivery) return next(createError('Delivery not found', 404));
    if (delivery.rider_id) return next(createError('Delivery already claimed', 409));

    const claimed = await deliveryModel.claim(id, riderId);
    if (!claimed) return next(createError('Could not claim delivery (race condition)', 409));

    await deliveryModel.updateStatus(id, 'assigned');
    await notificationService.notifyDeliveryAssigned(delivery, riderId, req.projectRef);

    await writeAuditLog({
      userId: riderId,
      action: 'delivery.claimed',
      resourceType: 'delivery',
      resourceId: id,
      ip: req.ip,
    });

    return res.json({ delivery: claimed });
  } catch (err) {
    next(err);
  }
}

async function updateDeliveryStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const delivery = await deliveryModel.findById(id);
    if (!delivery) return next(createError('Delivery not found', 404));
    if (req.user?.role === 'rider' && delivery.rider_id && delivery.rider_id !== req.user.id) {
      return next(createError('Access denied', 403));
    }

    const updated = await deliveryModel.updateStatus(id, status);

    wsServer.broadcast(req.projectRef, {
      type: 'order:status_changed',
      orderId: delivery.order_id,
      deliveryStatus: status,
      updatedAt: new Date().toISOString(),
    });

    return res.json({ delivery: updated });
  } catch (err) {
    next(err);
  }
}

async function updateLocation(req, res, next) {
  try {
    const { id } = req.params;
    const { lat, lon, heading, speed } = req.body;
    const riderId = req.user.id;

    const delivery = await deliveryModel.findById(id);
    if (!delivery) return next(createError('Delivery not found', 404));
    if (req.user?.role === 'rider' && delivery.rider_id && delivery.rider_id !== riderId) {
      return next(createError('Access denied', 403));
    }

    const allowed = await sessionService.checkLocationRateLimit(id);
    if (!allowed) {
      return res.status(429).json({ error: 'Location updates too frequent. Max 1 per 3 seconds.' });
    }

    await sessionService.cacheRiderLocation(id, { lat, lon, heading, speed, updatedAt: new Date().toISOString() });
    // Also update rider availability location so matching works even outside dispatch UI
    await sessionService.cacheRiderAvailability(req.projectRef, riderId, { lat, lon, heading: heading || null, speed: speed || null, updatedAt: new Date().toISOString() });

    wsServer.broadcast(req.projectRef, {
      type: 'delivery:location_update',
      deliveryId: id,
      lat,
      lon,
      heading: heading || null,
      speed: speed || null,
    });

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function updateRiderAvailability(req, res, next) {
  try {
    const { lat, lon, heading, speed } = req.body;
    const riderId = req.user.id;
    await sessionService.cacheRiderAvailability(req.projectRef, riderId, {
      lat,
      lon,
      heading: heading || null,
      speed: speed || null,
      updatedAt: new Date().toISOString(),
    });
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function getLocation(req, res, next) {
  try {
    const { id } = req.params;
    const location = await sessionService.getRiderLocation(id);
    if (!location) return res.status(404).json({ error: 'Location not available' });
    return res.json({ location });
  } catch (err) {
    next(err);
  }
}

// ─── Rider Arrived ───────────────────────────────────────────────────────────

async function riderArrived(req, res, next) {
  try {
    const { id } = req.params;

    const delivery = await deliveryModel.findById(id);
    if (!delivery) return next(createError('Delivery not found', 404));
    if (req.user?.role === 'rider' && delivery.rider_id && delivery.rider_id !== req.user.id) {
      return next(createError('Access denied', 403));
    }

    const updated = await deliveryModel.updateStatus(id, 'arrived');

    wsServer.broadcast(req.projectRef, {
      type: 'delivery:rider_arrived',
      deliveryId: id,
      orderId: delivery.order_id,
      updatedAt: new Date().toISOString(),
    });

    if (delivery.order_id) {
      await notificationService.notifyRiderArrived(delivery, delivery.order_id, req.projectRef);
    }

    await writeAuditLog({
      userId: req.user?.id,
      action: 'delivery.rider_arrived',
      resourceType: 'delivery',
      resourceId: id,
      ip: req.ip,
    });

    return res.json({ delivery: updated });
  } catch (err) {
    next(err);
  }
}

// ─── Assign Rider ────────────────────────────────────────────────────────────

async function assignRider(req, res, next) {
  try {
    const { id } = req.params;
    const { riderId } = req.body;

    const delivery = await deliveryModel.findById(id);
    if (!delivery) return next(createError('Delivery not found', 404));

    const claimed = await deliveryModel.claim(id, riderId);
    if (!claimed) return next(createError('Could not assign rider', 409));

    await deliveryModel.updateStatus(id, 'assigned');
    await notificationService.notifyDeliveryAssigned(delivery, riderId, req.projectRef);

    wsServer.broadcast(req.projectRef, {
      type: 'delivery:rider_assigned',
      deliveryId: id,
      riderId,
      orderId: delivery.order_id,
      updatedAt: new Date().toISOString(),
    });

    await writeAuditLog({
      userId: req.user?.id,
      action: 'delivery.rider_assigned',
      resourceType: 'delivery',
      resourceId: id,
      details: { riderId },
      ip: req.ip,
    });

    return res.json({ delivery: claimed });
  } catch (err) {
    next(err);
  }
}

// ─── Reassign Delivery ──────────────────────────────────────────────────────

async function reassignDelivery(req, res, next) {
  try {
    const { id } = req.params;
    const delivery = await deliveryModel.findById(id);
    if (!delivery) return next(createError('Delivery not found', 404));

    await deliveryModel.reassign(id);

    wsServer.broadcast(req.projectRef, {
      type: 'delivery:request',
      deliveryId: id,
      orderId: delivery.order_id,
      createdAt: new Date().toISOString(),
    });

    const order = await require('../models/order.model').findById(delivery.order_id);
    if (order?.customer_id) {
      await notificationService.notifyOrderStatusChange(
        order, order.customer_id, 'Your delivery is being reassigned to a new rider'
      );
    }

    await writeAuditLog({
      userId: req.user?.id || 'system',
      action: 'delivery.reassigned',
      resourceType: 'delivery',
      resourceId: id,
      ip: req.ip,
    });

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// ─── Assign External Rider ──────────────────────────────────────────────────

async function assignExternalRider(req, res, next) {
  try {
    const { id } = req.params;
    const { name, phone } = req.body;

    const delivery = await deliveryModel.findById(id);
    if (!delivery) return next(createError('Delivery not found', 404));

    const { update } = require('../lib/supabase');
    await update('deliveries', {
      external_rider_name: name,
      external_rider_phone: phone,
      is_external: true,
      status: 'assigned',
      updated_at: new Date().toISOString(),
    }, { id });

    const orderModel = require('../models/order.model');
    const order = await orderModel.findById(delivery.order_id);
    if (order?.customer_id) {
      await notificationService.notifyOrderStatusChange(
        order, order.customer_id, `A rider (${name}) has been assigned. Contact: ${phone}`
      );
    }

    wsServer.broadcast(req.projectRef, {
      type: 'order:status_changed',
      orderId: delivery.order_id,
      status: 'assigned',
      deliveryStatus: 'assigned',
      updatedAt: new Date().toISOString(),
    });

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listDeliveries,
  claimDelivery,
  updateDeliveryStatus,
  updateLocation,
  getLocation,
  updateRiderAvailability,
  riderArrived,
  assignRider,
  reassignDelivery,
  assignExternalRider,
};
