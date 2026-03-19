'use strict';

const cron = require('node-cron');
const { supabaseFetch } = require('../lib/supabase');
const deliveryModel = require('../models/delivery.model');
const vendorSettingsModel = require('../models/vendor-settings.model');
const riderGeofenceModel = require('../models/rider-geofence.model');
const wsServer = require('../websocket/ws-server');
const sessionService = require('../services/session.service');
const { select } = require('../lib/supabase');
const { haversineKm, getEffectiveGeofence, polygonsIntersect } = require('../lib/geo');
const logger = require('../lib/logger');
const { acquireLock, releaseLock } = require('../lib/lock');

function start() {
  const task = cron.schedule('*/30 * * * * *', async () => {
    const lock = await acquireLock('lock:job:auto-dispatch', 25_000);
    if (!lock) return;
    try {
      const readyOrders = await supabaseFetch(
        '/rest/v1/orders?status=eq.ready&select=id,project_ref,shop_id,updated_at'
      );

      if (!readyOrders || readyOrders.length === 0) return;

      for (const order of readyOrders) {
        const existing = await deliveryModel.findByOrderId(order.id);
        if (existing) continue;

        const vendorSettings = order.shop_id
          ? await vendorSettingsModel.findByShopId(order.shop_id)
          : await vendorSettingsModel.findByProjectRef(order.project_ref);
        const delayMinutes = vendorSettings?.auto_dispatch_delay_minutes || 0;

        if (delayMinutes > 0) {
          const readySince = new Date(order.updated_at).getTime();
          const delayMs = delayMinutes * 60000;
          if (Date.now() - readySince < delayMs) continue;
        }

        const delivery = await deliveryModel.create({ orderId: order.id });

        let shop = null;
        let shopGeofence = null;
        let vendorLat, vendorLon;

        if (order.shop_id) {
          const shops = await select('shops', { filters: { id: order.shop_id } });
          shop = shops?.[0];
          vendorLat = shop?.lat;
          vendorLon = shop?.lon;
          shopGeofence = getEffectiveGeofence(shop, vendorSettings);
        }
        if (!vendorLat || !vendorLon) {
          const workspaces = await select('workspaces', { filters: { project_ref: order.project_ref } });
          const workspace = workspaces?.[0];
          vendorLat = workspace?.lat;
          vendorLon = workspace?.lon;
        }

        const baseRadiusKm = vendorSettings?.delivery_radius_km || 5.0;
        await sessionService.cacheDeliverySearchRadius(delivery.id, baseRadiusKm);

        const isVendorRider = vendorSettings?.delivery_mode === 'vendor_rider';

        let notified = 0;
        const onlineRiders = wsServer.listOnlineUsersByRole(order.project_ref, 'rider');

        for (const riderId of onlineRiders) {
          const loc = await sessionService.getRiderAvailability(order.project_ref, riderId);
          if (!loc?.lat || !loc?.lon) continue;

          let shouldNotify = false;

          if (isVendorRider) {
            shouldNotify = true;
          } else if (shopGeofence) {
            const riderGeo = await riderGeofenceModel.findByUserId(riderId);
            if (riderGeo?.geofence) {
              shouldNotify = polygonsIntersect(shopGeofence, riderGeo.geofence);
            } else if (vendorLat && vendorLon) {
              shouldNotify = haversineKm(loc.lat, loc.lon, vendorLat, vendorLon) <= baseRadiusKm;
            }
          } else if (vendorLat && vendorLon) {
            shouldNotify = haversineKm(loc.lat, loc.lon, vendorLat, vendorLon) <= baseRadiusKm;
          }

          if (shouldNotify) {
            notified += wsServer.sendToUser(order.project_ref, riderId, {
              type: 'delivery:request',
              deliveryId: delivery.id,
              orderId: order.id,
              createdAt: new Date().toISOString(),
              radiusKm: baseRadiusKm,
            });
          }
        }

        if (notified === 0) {
          wsServer.broadcast(order.project_ref, {
            type: 'delivery:request',
            deliveryId: delivery.id,
            orderId: order.id,
            createdAt: new Date().toISOString(),
          });
        }

        logger.info('Auto-dispatched delivery', {
          orderId: order.id,
          deliveryId: delivery.id,
          notifiedRiders: notified,
        });
      }
    } catch (err) {
      logger.error('Auto-dispatch job error', { error: err.message });
    } finally {
      await releaseLock(lock);
    }
  });

  logger.info('Background job started: auto-dispatch (every 30s)');
  return task;
}

module.exports = { start };
