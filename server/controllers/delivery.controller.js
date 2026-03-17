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
    const { zoneId } = req.query;
    const deliveries = await deliveryModel.findForRider(riderId, zoneId);
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

    const allowed = await sessionService.checkLocationRateLimit(id);
    if (!allowed) {
      return res.status(429).json({ error: 'Location updates too frequent. Max 1 per 3 seconds.' });
    }

    await sessionService.cacheRiderLocation(id, { lat, lon, heading, speed, updatedAt: new Date().toISOString() });

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

module.exports = { listDeliveries, claimDelivery, updateDeliveryStatus, updateLocation, getLocation };
