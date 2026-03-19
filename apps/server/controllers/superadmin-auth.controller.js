'use strict';

const config = require('../config');
const superadminModel = require('../models/superadmin.model');
const sessionService = require('../services/session.service');
const logger = require('../lib/logger');

const COOKIE_BASE = {
  httpOnly: true,
  secure: config.isProd,
  sameSite: config.isProd ? 'none' : 'lax',
  path: '/',
};

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await superadminModel.findByEmail(email);
    const ok = user ? await superadminModel.verifyPassword(user, password) : false;

    if (!user || !ok) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const sessionId = await sessionService.createSuperadminSession({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    res.cookie('superadmin_session', sessionId, {
      ...COOKIE_BASE,
      maxAge: config.session.adminTTL * 1000,
    });

    return res.json({ user: superadminModel.sanitise(user) });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    if (req.superadminSessionId) {
      await sessionService.deleteSuperadminSession(req.superadminSessionId);
    }
    res.clearCookie('superadmin_session', COOKIE_BASE);
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function getSession(req, res) {
  if (!req.superadmin) return res.status(401).json({ error: 'Not authenticated' });
  const user = await superadminModel.findById(req.superadmin.id);
  return res.json({ user: superadminModel.sanitise(user) });
}

module.exports = { login, logout, getSession };
