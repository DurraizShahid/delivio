'use strict';

const cron = require('node-cron');
const { supabaseFetch } = require('../lib/supabase');
const deliveryModel = require('../models/delivery.model');
const vendorSettingsModel = require('../models/vendor-settings.model');
const wsServer = require('../websocket/ws-server');
const logger = require('../lib/logger');

/**
 * Every 30 seconds: find orders with status 'ready' that have no
 * delivery record yet — create one and broadcast to available riders.
 */
function start() {
  const task = cron.schedule('*/30 * * * * *', async () => {
    try {
      const readyOrders = await supabaseFetch(
        '/rest/v1/orders?status=eq.ready&select=id,project_ref,updated_at'
      );

      if (!readyOrders || readyOrders.length === 0) return;

      for (const order of readyOrders) {
        const existing = await deliveryModel.findByOrderId(order.id);
        if (existing) continue;

        const vendorSettings = await vendorSettingsModel.findByProjectRef(order.project_ref);
        const delayMinutes = vendorSettings?.auto_dispatch_delay_minutes || 0;

        if (delayMinutes > 0) {
          const readySince = new Date(order.updated_at).getTime();
          const delayMs = delayMinutes * 60000;
          if (Date.now() - readySince < delayMs) continue;
        }

        const delivery = await deliveryModel.create({ orderId: order.id });

        wsServer.broadcast(order.project_ref, {
          type: 'delivery:request',
          deliveryId: delivery.id,
          orderId: order.id,
          createdAt: new Date().toISOString(),
        });

        logger.info('Auto-dispatched delivery', {
          orderId: order.id,
          deliveryId: delivery.id,
        });
      }
    } catch (err) {
      logger.error('Auto-dispatch job error', { error: err.message });
    }
  });

  logger.info('Background job started: auto-dispatch (every 30s)');
  return task;
}

module.exports = { start };
