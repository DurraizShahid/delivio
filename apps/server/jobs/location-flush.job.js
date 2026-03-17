'use strict';

const cron = require('node-cron');
const { getRedis } = require('../lib/redis');
const deliveryModel = require('../models/delivery.model');
const logger = require('../lib/logger');

/**
 * Every 30 seconds: flush in-flight rider locations from Redis cache
 * into the rider_locations audit table.
 */
function start() {
  const task = cron.schedule('*/30 * * * * *', async () => {
    const redis = getRedis();
    if (!redis) return; // No Redis — nothing to flush

    try {
      const keys = await redis.keys('location:*');
      if (!keys.length) return;

      // Filter out rate-limit keys
      const locationKeys = keys.filter((k) => !k.includes(':rate:'));

      for (const key of locationKeys) {
        const deliveryId = key.replace('location:', '');
        const raw = await redis.get(key);
        if (!raw) continue;

        try {
          const loc = JSON.parse(raw);
          const delivery = await deliveryModel.findById(deliveryId);
          if (!delivery?.rider_id) continue;

          await deliveryModel.logLocation(deliveryId, delivery.rider_id, {
            lat: loc.lat,
            lon: loc.lon,
            heading: loc.heading,
            speed: loc.speed,
          });
        } catch (err) {
          logger.warn('Location flush: failed for delivery', { deliveryId, error: err.message });
        }
      }
    } catch (err) {
      logger.error('Location flush job error', { error: err.message });
    }
  });

  logger.info('Background job started: location-flush (every 30s)');
  return task;
}

module.exports = { start };
