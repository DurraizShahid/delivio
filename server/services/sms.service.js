'use strict';

const config = require('../config');
const logger = require('../lib/logger');

let _twilioClient = null;

function getTwilio() {
  if (_twilioClient) return _twilioClient;
  if (!config.twilio.enabled) return null;
  const twilio = require('twilio');
  _twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);
  return _twilioClient;
}

/**
 * Send an SMS message.
 * Falls back to console.log when Twilio is not configured.
 */
async function sendSMS({ to, body }) {
  const client = getTwilio();

  if (!client) {
    logger.warn('[SMS FALLBACK] Would send SMS:', { to, body });
    return { sid: 'dev-fallback', status: 'logged' };
  }

  try {
    const message = await client.messages.create({
      from: config.twilio.phoneNumber,
      to,
      body,
    });
    logger.info('SMS sent', { sid: message.sid, to });
    return message;
  } catch (err) {
    logger.error('SMS send failed', { to, error: err.message });
    throw err;
  }
}

/**
 * Generate a cryptographically random 6-digit OTP.
 */
function generateOTP() {
  const crypto = require('crypto');
  return String(crypto.randomInt(100000, 999999));
}

module.exports = { sendSMS, generateOTP };
