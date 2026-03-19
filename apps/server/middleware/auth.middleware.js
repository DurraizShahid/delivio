'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');
const { getAdminSession, getCustomerSession, getSuperadminSession } = require('../services/session.service');

/**
 * Parse session cookie and attach identity to req.
 * Checks superadmin, admin, and customer sessions in priority order.
 */
async function parseSession(req, res, next) {
  try {
    const superadminSid = req.cookies?.superadmin_session;
    const adminSid = req.cookies?.admin_session;
    const customerSid = req.cookies?.customer_session;

    if (superadminSid) {
      const session = await getSuperadminSession(superadminSid);
      if (session) {
        req.superadmin = session;
        req.superadminSessionId = superadminSid;
        return next();
      }
    }

    if (adminSid) {
      const session = await getAdminSession(adminSid);
      if (session) {
        req.user = session;
        req.sessionId = adminSid;
        return next();
      }
    }

    if (customerSid) {
      const session = await getCustomerSession(customerSid);
      if (session) {
        req.customer = session;
        req.customerSessionId = customerSid;
        return next();
      }
    }

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const payload = jwt.verify(token, config.jwt.secret);
        if (payload.type === 'superadmin') req.superadmin = payload;
        else if (payload.type === 'admin') req.user = payload;
        else if (payload.type === 'customer') req.customer = payload;
      } catch {
        // Invalid JWT
      }
    }

    next();
  } catch (err) {
    next(err);
  }
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

function requireCustomer(req, res, next) {
  if (!req.customer) {
    return res.status(401).json({ error: 'Customer authentication required' });
  }
  next();
}

function requireAnyAuth(req, res, next) {
  if (!req.user && !req.customer) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

function requireSuperadmin(req, res, next) {
  if (!req.superadmin) {
    return res.status(401).json({ error: 'Superadmin authentication required' });
  }
  next();
}

function getCallerId(req) {
  return req.superadmin?.id || req.user?.id || req.customer?.id || null;
}

function getCallerRole(req) {
  if (req.superadmin) return 'superadmin';
  if (req.user) return req.user.role;
  if (req.customer) return 'customer';
  return null;
}

module.exports = {
  parseSession,
  requireAdmin,
  requireRole,
  requireCustomer,
  requireAnyAuth,
  requireSuperadmin,
  getCallerId,
  getCallerRole,
};
