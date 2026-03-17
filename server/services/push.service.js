'use strict';

const config = require('../config');
const logger = require('../lib/logger');
const { remove } = require('../lib/supabase');

let _messaging = null;

function getMessaging() {
  if (_messaging) return _messaging;
  if (!config.firebase.enabled) return null;

  try {
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      const serviceAccount = JSON.parse(config.firebase.serviceAccountJson);
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    _messaging = admin.messaging();
    logger.info('Firebase Admin: initialized');
    return _messaging;
  } catch (err) {
    logger.error('Firebase Admin: initialization failed', { error: err.message });
    return null;
  }
}

/**
 * Send a push notification to a single device token.
 */
async function sendPushNotification({ token, title, body, data = {} }) {
  const messaging = getMessaging();
  if (!messaging) {
    logger.debug('[PUSH FALLBACK]', { title, body });
    return null;
  }

  try {
    const result = await messaging.send({
      token,
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
    });
    return result;
  } catch (err) {
    if (err.code === 'messaging/invalid-registration-token' || err.code === 'messaging/registration-token-not-registered') {
      logger.warn('Push: stale token, removing', { token: token.slice(0, 20) });
      await _removeStaleToken(token);
    } else {
      logger.error('Push send failed', { error: err.message });
    }
    return null;
  }
}

/**
 * Send push notifications to multiple tokens.
 */
async function sendPushToMultiple({ tokens, title, body, data = {} }) {
  const messaging = getMessaging();
  if (!messaging || !tokens.length) return null;

  try {
    const result = await messaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
    });

    // Clean up stale tokens
    const staleTokens = tokens.filter((_, i) => {
      const r = result.responses[i];
      return !r.success && (
        r.error?.code === 'messaging/invalid-registration-token' ||
        r.error?.code === 'messaging/registration-token-not-registered'
      );
    });

    if (staleTokens.length) {
      await Promise.allSettled(staleTokens.map(_removeStaleToken));
    }

    return result;
  } catch (err) {
    logger.error('Push multicast failed', { error: err.message });
    return null;
  }
}

async function _removeStaleToken(token) {
  try {
    await remove('push_tokens', { token });
  } catch (err) {
    logger.error('Failed to remove stale push token', { error: err.message });
  }
}

module.exports = { sendPushNotification, sendPushToMultiple };
