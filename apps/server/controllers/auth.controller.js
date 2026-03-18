'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { totp } = require('otplib');
const qrcode = require('qrcode');

const config = require('../config');
const userModel = require('../models/user.model');
const customerModel = require('../models/customer.model');
const sessionService = require('../services/session.service');
const { sendSMS, generateOTP } = require('../services/sms.service');
const { sendEmail, passwordResetEmail } = require('../services/email.service');
const { writeAuditLog } = require('../lib/audit');
const logger = require('../lib/logger');

const COOKIE_BASE = {
  httpOnly: true,
  secure: config.isProd,
  sameSite: config.isProd ? 'none' : 'lax',
  path: '/',
};

// ─── Admin Auth ───────────────────────────────────────────────────────────────

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await userModel.findByEmail(email);

    const passwordOk = user ? await userModel.verifyPassword(user, password) : false;

    if (!user || !passwordOk) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.totp_enabled) {
      // Return a short-lived pre-auth token instead of a full session
      const preAuthToken = jwt.sign(
        { userId: user.id, step: 'totp', type: 'pre_auth' },
        config.jwt.secret,
        { expiresIn: '5m' }
      );
      return res.json({ requiresTwoFactor: true, preAuthToken });
    }

    const sessionId = await sessionService.createAdminSession({
      id: user.id,
      email: user.email,
      role: user.role,
      projectRef: user.project_ref,
      type: 'admin',
    });

    res.cookie('admin_session', sessionId, { ...COOKIE_BASE, maxAge: config.session.adminTTL * 1000 });

    await writeAuditLog({ userId: user.id, action: 'auth.login', ip: req.ip });

    return res.json({ user: userModel.sanitise(user) });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    if (req.sessionId) {
      await sessionService.deleteAdminSession(req.sessionId);
    }
    res.clearCookie('admin_session', COOKIE_BASE);
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function getSession(req, res) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const user = await userModel.findById(req.user.id);
  return res.json({ user: userModel.sanitise(user) });
}

async function signup(req, res, next) {
  try {
    const { email, password, role, projectRef } = req.body;

    const existing = await userModel.findByEmail(email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const user = await userModel.create({ email, password, role, projectRef });
    await writeAuditLog({ userId: user.id, action: 'auth.signup', ip: req.ip });

    return res.status(201).json({ user: userModel.sanitise(user) });
  } catch (err) {
    next(err);
  }
}

// ─── Password Reset ───────────────────────────────────────────────────────────

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const user = await userModel.findByEmail(email);

    // Always return 200 to prevent user enumeration
    if (!user) return res.json({ ok: true });

    const token = crypto.randomBytes(32).toString('hex');
    await sessionService.setResetToken(token, { userId: user.id, email: user.email });

    const resetUrl = `${req.headers.origin || 'https://app.delivio.com'}/reset-password?token=${token}`;
    const template = passwordResetEmail(resetUrl);
    await sendEmail({ to: email, ...template });

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    const tokenData = await sessionService.getResetToken(token);

    if (!tokenData) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    await userModel.updatePassword(tokenData.userId, password);
    await sessionService.deleteResetToken(token);

    await writeAuditLog({ userId: tokenData.userId, action: 'auth.password_reset', ip: req.ip });

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// ─── Customer OTP Auth ────────────────────────────────────────────────────────

async function sendOTP(req, res, next) {
  try {
    const { phone, projectRef } = req.body;

    const allowed = await sessionService.checkOTPRateLimit(phone);
    if (!allowed) {
      return res.status(429).json({
        error: 'Too many OTP requests. Please wait 15 minutes before trying again.',
      });
    }

    const code = generateOTP();
    await sessionService.setOTP(phone, code);

    await sendSMS({
      to: phone,
      body: `Your Delivio verification code is: ${code}. It expires in 5 minutes.`,
    });

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function verifyOTP(req, res, next) {
  try {
    const { phone, code, projectRef, name, email } = req.body;

    const otpEntry = await sessionService.getOTP(phone);
    if (!otpEntry) {
      return res.status(400).json({ error: 'OTP expired or not found. Please request a new code.' });
    }

    if (otpEntry.attempts >= config.otp.maxAttempts) {
      await sessionService.deleteOTP(phone);
      return res.status(400).json({ error: 'Too many incorrect attempts. Please request a new code.' });
    }

    if (otpEntry.code !== code) {
      await sessionService.incrementOTPAttempts(phone, otpEntry);
      return res.status(400).json({ error: 'Incorrect verification code' });
    }

    await sessionService.deleteOTP(phone);

    const { customer, created } = await customerModel.findOrCreate({ phone, projectRef });

    // Update profile if provided on first login
    if (created && (name || email)) {
      await customerModel.updateProfile(customer.id, { name, email });
    }

    const sessionId = await sessionService.createCustomerSession({
      id: customer.id,
      phone: customer.phone,
      name: customer.name,
      projectRef: customer.project_ref,
      type: 'customer',
    });

    res.cookie('customer_session', sessionId, {
      ...COOKIE_BASE,
      maxAge: config.session.customerTTL * 1000,
    });

    return res.status(created ? 201 : 200).json({ customer, created });
  } catch (err) {
    next(err);
  }
}

async function getCustomerSession(req, res) {
  if (!req.customer) return res.status(401).json({ error: 'Not authenticated' });
  const customer = await customerModel.findById(req.customer.id);
  return res.json({ customer });
}

async function customerLogout(req, res, next) {
  try {
    if (req.customerSessionId) {
      await sessionService.deleteCustomerSession(req.customerSessionId);
    }
    res.clearCookie('customer_session', COOKIE_BASE);
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// ─── 2FA (TOTP) ───────────────────────────────────────────────────────────────

async function setup2FA(req, res, next) {
  try {
    const user = await userModel.findById(req.user.id);
    if (!(await userModel.verifyPassword(user, req.body.password))) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    const secret = totp.generateSecret();
    const otpAuthUrl = totp.keyuri(user.email, 'Delivio', secret);
    const qrDataUrl = await qrcode.toDataURL(otpAuthUrl);

    // Store secret temporarily — will be confirmed in verify2FA
    await sessionService.getStore().set(
      `totp:setup:${user.id}`,
      { secret },
      300 // 5 minutes to complete setup
    );

    return res.json({ qrCode: qrDataUrl, secret });
  } catch (err) {
    next(err);
  }
}

async function verify2FA(req, res, next) {
  try {
    const setup = await sessionService.getStore().get(`totp:setup:${req.user.id}`);
    if (!setup) return res.status(400).json({ error: '2FA setup session expired' });

    const isValid = totp.verify({ token: req.body.token, secret: setup.secret });
    if (!isValid) return res.status(400).json({ error: 'Invalid TOTP token' });

    await userModel.enableTOTP(req.user.id, setup.secret);
    await sessionService.getStore().delete(`totp:setup:${req.user.id}`);

    await writeAuditLog({ userId: req.user.id, action: 'auth.2fa_enabled', ip: req.ip });

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function login2FA(req, res, next) {
  try {
    const { sessionToken, totpToken } = req.body;
    let payload;
    try {
      payload = jwt.verify(sessionToken, config.jwt.secret);
    } catch {
      return res.status(400).json({ error: 'Invalid or expired pre-auth token' });
    }

    if (payload.step !== 'totp') return res.status(400).json({ error: 'Invalid token type' });

    const user = await userModel.findById(payload.userId);
    if (!user?.totp_enabled) return res.status(400).json({ error: '2FA not configured' });

    const isValid = totp.verify({ token: totpToken, secret: user.totp_secret });
    if (!isValid) return res.status(400).json({ error: 'Invalid TOTP code' });

    const sessionId = await sessionService.createAdminSession({
      id: user.id,
      email: user.email,
      role: user.role,
      projectRef: user.project_ref,
      type: 'admin',
    });

    res.cookie('admin_session', sessionId, { ...COOKIE_BASE, maxAge: config.session.adminTTL * 1000 });

    await writeAuditLog({ userId: user.id, action: 'auth.2fa_login', ip: req.ip });

    return res.json({ user: userModel.sanitise(user) });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login, logout, getSession, signup,
  forgotPassword, resetPassword,
  sendOTP, verifyOTP, getCustomerSession, customerLogout,
  setup2FA, verify2FA, login2FA,
};
