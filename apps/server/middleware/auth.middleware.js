'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');
const { getAdminSession, getCustomerSession } = require('../services/session.service');

/**
 * Parse session cookie and attach identity to req.
 * Does NOT reject — use requireAdmin/requireCustomer guards for that.
 */
async function parseSession(req, res, next) {
  try {
    const adminSid = req.cookies?.admin_session;
    const customerSid = req.cookies?.customer_session;

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

    // Check Authorization Bearer JWT (for API clients / mobile)
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const payload = jwt.verify(token, config.jwt.secret);
        if (payload.type === 'admin') req.user = payload;
        else if (payload.type === 'customer') req.customer = payload;
      } catch {
        // Invalid JWT — continue as unauthenticated
      }
    }

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Require a valid admin/staff session.
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

/**
 * Require admin with specific role(s).
 */
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

/**
 * Require a valid customer session.
 */
function requireCustomer(req, res, next) {
  if (!req.customer) {
    return res.status(401).json({ error: 'Customer authentication required' });
  }
  next();
}

/**
 * Require either admin or customer session.
 */
function requireAnyAuth(req, res, next) {
  if (!req.user && !req.customer) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

/**
 * Return the authenticated user's ID regardless of type.
 */
function getCallerId(req) {
  return req.user?.id || req.customer?.id || null;
}

/**
 * Return the caller's role.
 */
function getCallerRole(req) {
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
  getCallerId,
  getCallerRole,
};
