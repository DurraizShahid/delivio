'use strict';

const cron = require('node-cron');
const { supabaseFetch } = require('../lib/supabase');
const wsServer = require('../websocket/ws-server');
const logger = require('../lib/logger');

function start() {
  const task = cron.schedule('*/2 * * * *', async () => {
    try {
      const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
      const staleDeliveries = await supabaseFetch(
        `/rest/v1/deliveries?status=eq.pending&rider_id=is.null&created_at=lt.${encodeURIComponent(fiveMinAgo)}&select=*`
      );

      if (!staleDeliveries || staleDeliveries.length === 0) return;

      for (const delivery of staleDeliveries) {
        const order = await supabaseFetch(`/rest/v1/orders?id=eq.${delivery.order_id}&select=project_ref`);
        if (!order?.[0]) continue;

        wsServer.broadcast(order[0].project_ref, {
          type: 'delivery:request',
          deliveryId: delivery.id,
          orderId: delivery.order_id,
          expandedSearch: true,
          createdAt: new Date().toISOString(),
        });

        logger.info('Expanded rider search for stale delivery', { deliveryId: delivery.id });
      }
    } catch (err) {
      logger.error('Radius expansion job error', { error: err.message });
    }
  });

  logger.info('Background job started: radius-expansion (every 2min)');
  return task;
}

module.exports = { start };
