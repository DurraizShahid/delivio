'use strict';

const cron = require('node-cron');
const cartModel = require('../models/cart.model');
const logger = require('../lib/logger');
const { acquireLock, releaseLock } = require('../lib/lock');

/**
 * Daily at 03:00 UTC: remove cart sessions older than 30 days.
 */
function start() {
  const task = cron.schedule('0 3 * * *', async () => {
    const lock = await acquireLock('lock:job:cart-cleanup', 5 * 60_000);
    if (!lock) return;
    try {
      logger.info('Cart cleanup job: removing sessions older than 30 days');
      await cartModel.cleanOldSessions(30);
      logger.info('Cart cleanup job: complete');
    } catch (err) {
      logger.error('Cart cleanup job error', { error: err.message });
    } finally {
      await releaseLock(lock);
    }
  });

  logger.info('Background job started: cart-cleanup (daily at 03:00 UTC)');
  return task;
}

module.exports = { start };
