'use strict';

const cron = require('node-cron');
const orderModel = require('../models/order.model');
const wsServer = require('../websocket/ws-server');
const logger = require('../lib/logger');
const { acquireLock, releaseLock } = require('../lib/lock');

/**
 * Every 60 seconds: transition 'scheduled' orders whose scheduled_for
 * has passed into 'pending' status and broadcast the change.
 */
function start() {
  const task = cron.schedule('* * * * *', async () => {
    const lock = await acquireLock('lock:job:scheduled-orders', 55_000);
    if (!lock) return;
    try {
      const dueOrders = await orderModel.getScheduledDue();
      if (!dueOrders || dueOrders.length === 0) return;

      logger.info(`Scheduled orders job: processing ${dueOrders.length} due order(s)`);

      for (const order of dueOrders) {
        // Scheduled orders become "placed" when due (matches lifecycle state machine)
        await orderModel.updateStatus(order.id, 'placed');

        wsServer.broadcast(order.project_ref, {
          type: 'order:status_changed',
          orderId: order.id,
          status: 'placed',
          previousStatus: 'scheduled',
          updatedAt: new Date().toISOString(),
        });

        logger.info('Scheduled order transitioned to placed', { orderId: order.id });
      }
    } catch (err) {
      logger.error('Scheduled orders job error', { error: err.message });
    } finally {
      await releaseLock(lock);
    }
  });

  logger.info('Background job started: scheduled-orders (every 60s)');
  return task;
}

module.exports = { start };
