'use strict';

const cron = require('node-cron');
const { supabaseFetch, select } = require('../lib/supabase');
const wsServer = require('../websocket/ws-server');
const logger = require('../lib/logger');
const sessionService = require('../services/session.service');
const vendorSettingsModel = require('../models/vendor-settings.model');
const riderGeofenceModel = require('../models/rider-geofence.model');
const adminSettingsModel = require('../models/admin-settings.model');
const { haversineKm, getEffectiveGeofence, polygonsIntersect } = require('../lib/geo');
const { acquireLock, releaseLock } = require('../lib/lock');

function start() {
  const task = cron.schedule('*/2 * * * *', async () => {
    const lock = await acquireLock('lock:job:radius-expansion', 110_000);
    if (!lock) return;
    try {
      const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
      const staleDeliveries = await supabaseFetch(
        `/rest/v1/deliveries?status=eq.pending&rider_id=is.null&created_at=lt.${encodeURIComponent(fiveMinAgo)}&select=*`
      );

      if (!staleDeliveries || staleDeliveries.length === 0) return;

      for (const delivery of staleDeliveries) {
        const orders = await supabaseFetch(`/rest/v1/orders?id=eq.${delivery.order_id}&select=project_ref,shop_id`);
        if (!orders?.[0]) continue;

        const { project_ref: projectRef, shop_id: shopId } = orders[0];

        const settings = shopId
          ? await vendorSettingsModel.findByShopId(shopId)
          : await vendorSettingsModel.findByProjectRef(projectRef);
        const adminSettings = await adminSettingsModel.get();
        const maxRadiusKm = adminSettings?.max_search_radius_km || 15.0;
        const stepKm = 2.0;

        const currentRadius = (await sessionService.getDeliverySearchRadius(delivery.id)) ?? (settings?.delivery_radius_km || 5.0);
        const nextRadius = Math.min(currentRadius + stepKm, maxRadiusKm);
        await sessionService.cacheDeliverySearchRadius(delivery.id, nextRadius);

        let vendorLat, vendorLon;
        let shop = null;

        if (shopId) {
          const shops = await select('shops', { filters: { id: shopId } });
          shop = shops?.[0];
          vendorLat = shop?.lat;
          vendorLon = shop?.lon;
        }
        if (!vendorLat || !vendorLon) {
          const workspaces = await select('workspaces', { filters: { project_ref: projectRef } });
          const workspace = workspaces?.[0];
          vendorLat = workspace?.lat;
          vendorLon = workspace?.lon;
        }

        const shopGeofence = shop ? getEffectiveGeofence(shop, settings) : null;
        const isVendorRider = settings?.delivery_mode === 'vendor_rider';

        let notified = 0;
        const onlineRiders = wsServer.listOnlineUsersByRole(projectRef, 'rider');

        for (const riderId of onlineRiders) {
          const loc = await sessionService.getRiderAvailability(projectRef, riderId);
          if (!loc?.lat || !loc?.lon) continue;

          let shouldNotify = false;

          if (isVendorRider) {
            shouldNotify = true;
          } else if (shopGeofence) {
            const riderGeo = await riderGeofenceModel.findByUserId(riderId);
            if (riderGeo?.geofence) {
              shouldNotify = polygonsIntersect(shopGeofence, riderGeo.geofence);
            } else if (vendorLat && vendorLon) {
              shouldNotify = haversineKm(loc.lat, loc.lon, vendorLat, vendorLon) <= nextRadius;
            }
          } else if (vendorLat && vendorLon) {
            shouldNotify = haversineKm(loc.lat, loc.lon, vendorLat, vendorLon) <= nextRadius;
          }

          if (shouldNotify) {
            notified += wsServer.sendToUser(projectRef, riderId, {
              type: 'delivery:request',
              deliveryId: delivery.id,
              orderId: delivery.order_id,
              expandedSearch: true,
              createdAt: new Date().toISOString(),
              radiusKm: nextRadius,
            });
          }
        }

        if (notified === 0) {
          wsServer.broadcast(projectRef, {
            type: 'delivery:request',
            deliveryId: delivery.id,
            orderId: delivery.order_id,
            expandedSearch: true,
            createdAt: new Date().toISOString(),
            radiusKm: nextRadius,
          });
        }

        logger.info('Expanded rider search for stale delivery', { deliveryId: delivery.id, radiusKm: nextRadius, notifiedRiders: notified });
      }
    } catch (err) {
      logger.error('Radius expansion job error', { error: err.message });
    } finally {
      await releaseLock(lock);
    }
  });

  logger.info('Background job started: radius-expansion (every 2min)');
  return task;
}

module.exports = { start };
