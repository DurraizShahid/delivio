'use strict';

const config = require('../config');
const logger = require('./logger');

let redisClient = null;

function getRedis() {
  if (redisClient) return redisClient;

  if (!config.redis.url) {
    logger.warn('REDIS_URL not set — Redis client unavailable. Session store will use in-memory fallback.');
    return null;
  }

  const Redis = require('ioredis');

  redisClient = new Redis(config.redis.url, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    retryStrategy: (times) => {
      if (times > 5) {
        logger.error('Redis: too many reconnection attempts, giving up');
        return null;
      }
      return Math.min(times * 200, 2000);
    },
    reconnectOnError: (err) => {
      logger.warn('Redis reconnect on error', { message: err.message });
      return true;
    },
  });

  redisClient.on('connect', () => logger.info('Redis: connected'));
  redisClient.on('error', (err) => logger.error('Redis error', { message: err.message }));
  redisClient.on('close', () => logger.warn('Redis: connection closed'));

  return redisClient;
}

module.exports = { getRedis };
