'use strict';

const cron = require('node-cron');
const { supabaseFetch } = require('../lib/supabase');
const orderModel = require('../models/order.model');
const notificationService = require('../services/notification.service');
const wsServer = require('../websocket/ws-server');
const logger = require('../lib/logger');

/**
 * Every 60 seconds: find orders whose SLA deadline has passed but
 * have not yet been marked as breached — mark them and notify.
 */
function start() {
  const task = cron.schedule('* * * * *', async () => {
    try {
      const now = new Date().toISOString();
      const breached = await supabaseFetch(
        `/rest/v1/orders?sla_deadline=lt.${encodeURIComponent(now)}&sla_breached=eq.false&status=in.(accepted,preparing)&select=*`
      );

      if (!breached || breached.length === 0) return;

      logger.info(`SLA check job: ${breached.length} order(s) breached deadline`);

      for (const order of breached) {
        await orderModel.markSlaBreach(order.id);

        wsServer.broadcast(order.project_ref, {
          type: 'order:delayed',
          orderId: order.id,
          slaDeadline: order.sla_deadline,
          updatedAt: new Date().toISOString(),
        });

        if (order.customer_id) {
          await notificationService.notifyOrderStatusChange(
            order, order.customer_id, 'Your order is delayed'
          );
        }

        logger.info('SLA breached for order', { orderId: order.id });
      }
    } catch (err) {
      logger.error('SLA check job error', { error: err.message });
    }
  });

  logger.info('Background job started: sla-check (every 60s)');
  return task;
}

module.exports = { start };
