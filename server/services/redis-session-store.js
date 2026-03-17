'use strict';

/**
 * Redis-backed session store using ioredis.
 * Suitable for production and multi-process deployments.
 */
class RedisSessionStore {
  constructor(redisClient) {
    this._client = redisClient;
  }

  async get(id) {
    const value = await this._client.get(id);
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  async set(id, data, ttlSeconds) {
    const serialised = JSON.stringify(data);
    if (ttlSeconds) {
      await this._client.setex(id, ttlSeconds, serialised);
    } else {
      await this._client.set(id, serialised);
    }
  }

  async delete(id) {
    await this._client.del(id);
  }
}

module.exports = RedisSessionStore;
