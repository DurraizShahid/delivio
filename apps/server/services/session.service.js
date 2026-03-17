'use strict';

const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { getRedis } = require('../lib/redis');
const MemorySessionStore = require('./memory-session-store');
const RedisSessionStore = require('./redis-session-store');
const logger = require('../lib/logger');

let _store = null;

function getStore() {
  if (_store) return _store;

  const redis = getRedis();
  if (redis) {
    logger.info('Session store: Redis');
    _store = new RedisSessionStore(redis);
  } else {
    logger.warn('Session store: in-memory (not suitable for production)');
    _store = new MemorySessionStore();
  }
  return _store;
}

// ─── Admin/Staff Sessions ───────────────────────────────────────────────────

async function createAdminSession(userData) {
  const sessionId = uuidv4();
  const key = `session:admin:${sessionId}`;
  await getStore().set(key, { ...userData, type: 'admin' }, config.session.adminTTL);
  return sessionId;
}

async function getAdminSession(sessionId) {
  if (!sessionId) return null;
  return getStore().get(`session:admin:${sessionId}`);
}

async function deleteAdminSession(sessionId) {
  if (!sessionId) return;
  await getStore().delete(`session:admin:${sessionId}`);
}

// ─── Customer Sessions ───────────────────────────────────────────────────────

async function createCustomerSession(customerData) {
  const sessionId = uuidv4();
  const key = `session:customer:${sessionId}`;
  await getStore().set(key, { ...customerData, type: 'customer' }, config.session.customerTTL);
  return sessionId;
}

async function getCustomerSession(sessionId) {
  if (!sessionId) return null;
  return getStore().get(`session:customer:${sessionId}`);
}

async function deleteCustomerSession(sessionId) {
  if (!sessionId) return;
  await getStore().delete(`session:customer:${sessionId}`);
}

// ─── OTP Tokens ──────────────────────────────────────────────────────────────

async function setOTP(phone, code) {
  await getStore().set(`otp:${phone}`, { code, attempts: 0 }, config.otp.ttl);
}

async function getOTP(phone) {
  return getStore().get(`otp:${phone}`);
}

async function incrementOTPAttempts(phone, entry) {
  const updated = { ...entry, attempts: entry.attempts + 1 };
  const ttl = config.otp.ttl; // reset window not required; just overwrite
  await getStore().set(`otp:${phone}`, updated, ttl);
  return updated;
}

async function deleteOTP(phone) {
  await getStore().delete(`otp:${phone}`);
}

async function checkOTPRateLimit(phone) {
  const key = `otp:rate:${phone}`;
  const count = await getStore().get(key);
  if (count && count.count >= config.otp.rateLimitCount) return false;
  const current = count ? count.count : 0;
  await getStore().set(key, { count: current + 1 }, config.otp.rateLimitWindow);
  return true;
}

// ─── Password Reset Tokens ───────────────────────────────────────────────────

async function setResetToken(token, data) {
  await getStore().set(`reset:${token}`, data, 3600); // 1 hour
}

async function getResetToken(token) {
  return getStore().get(`reset:${token}`);
}

async function deleteResetToken(token) {
  await getStore().delete(`reset:${token}`);
}

// ─── Rider Location Cache ────────────────────────────────────────────────────

async function cacheRiderLocation(deliveryId, locationData) {
  await getStore().set(`location:${deliveryId}`, locationData, config.location.cacheTTL);
}

async function getRiderLocation(deliveryId) {
  return getStore().get(`location:${deliveryId}`);
}

async function flushLocationCache(deliveryId) {
  await getStore().delete(`location:${deliveryId}`);
}

// ─── Location Rate Limit (1 update per 3s per delivery) ─────────────────────

async function checkLocationRateLimit(deliveryId) {
  const key = `location:rate:${deliveryId}`;
  const exists = await getStore().get(key);
  if (exists) return false;
  await getStore().set(key, 1, config.location.updateIntervalSeconds);
  return true;
}

module.exports = {
  getStore,
  createAdminSession,
  getAdminSession,
  deleteAdminSession,
  createCustomerSession,
  getCustomerSession,
  deleteCustomerSession,
  setOTP,
  getOTP,
  incrementOTPAttempts,
  deleteOTP,
  checkOTPRateLimit,
  setResetToken,
  getResetToken,
  deleteResetToken,
  cacheRiderLocation,
  getRiderLocation,
  flushLocationCache,
  checkLocationRateLimit,
};
