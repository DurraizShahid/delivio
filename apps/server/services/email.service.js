'use strict';

const config = require('../config');
const logger = require('../lib/logger');

let _emailClient = null;

function getEmailClient() {
  if (_emailClient) return _emailClient;
  if (!config.email.enabled) return null;

  if (config.email.provider === 'resend') {
    const { Resend } = require('resend');
    _emailClient = new Resend(config.email.apiKey);
    return _emailClient;
  }

  logger.warn(`Email provider '${config.email.provider}' not yet implemented, falling back to console`);
  return null;
}

/**
 * Send a transactional email.
 * Falls back to console.log when provider is not configured.
 */
async function sendEmail({ to, subject, html, text }) {
  const client = getEmailClient();

  if (!client) {
    logger.warn('[EMAIL FALLBACK] Would send email:', { to, subject });
    if (process.env.NODE_ENV !== 'test') {
      console.log('--- EMAIL ---');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(text || html);
      console.log('-------------');
    }
    return { id: 'dev-fallback', status: 'logged' };
  }

  try {
    const result = await client.emails.send({
      from: config.email.fromAddress,
      to,
      subject,
      html,
      text,
    });
    logger.info('Email sent', { to, subject, id: result.id });
    return result;
  } catch (err) {
    logger.error('Email send failed', { to, subject, error: err.message });
    throw err;
  }
}

// ─── Email Templates ──────────────────────────────────────────────────────────

function passwordResetEmail(resetUrl) {
  return {
    subject: 'Reset your Delivio password',
    html: `
      <h2>Password Reset</h2>
      <p>Click the link below to reset your password. This link expires in 1 hour.</p>
      <a href="${resetUrl}" style="background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">
        Reset Password
      </a>
      <p>If you didn't request this, ignore this email.</p>
    `,
    text: `Reset your password: ${resetUrl}\n\nThis link expires in 1 hour.`,
  };
}

function refundConfirmationEmail(order, refundAmount) {
  return {
    subject: `Refund confirmed for order #${order.id.slice(0, 8).toUpperCase()}`,
    html: `
      <h2>Your refund has been processed</h2>
      <p>Order: #${order.id.slice(0, 8).toUpperCase()}</p>
      <p>Refund amount: ${(refundAmount / 100).toFixed(2)} ${(order.currency || 'GBP').toUpperCase()}</p>
      <p>Please allow 5-10 business days for the funds to appear in your account.</p>
    `,
    text: `Refund of ${(refundAmount / 100).toFixed(2)} processed for order #${order.id.slice(0, 8).toUpperCase()}.`,
  };
}

function orderCancellationEmail(order, reason) {
  return {
    subject: `Your order #${order.id.slice(0, 8).toUpperCase()} has been cancelled`,
    html: `
      <h2>Order Cancelled</h2>
      <p>Your order #${order.id.slice(0, 8).toUpperCase()} has been cancelled.</p>
      ${reason ? `<p>Reason: ${reason}</p>` : ''}
      ${order.payment_status === 'paid' ? '<p>A full refund has been issued and will appear in 5-10 business days.</p>' : ''}
    `,
    text: `Order #${order.id.slice(0, 8).toUpperCase()} cancelled.${reason ? ` Reason: ${reason}` : ''}`,
  };
}

module.exports = {
  sendEmail,
  passwordResetEmail,
  refundConfirmationEmail,
  orderCancellationEmail,
};
