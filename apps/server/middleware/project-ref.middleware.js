'use strict';

/**
 * Extract projectRef from multiple sources and attach to req.
 *
 * Priority:
 *   1. req.params.projectRef (explicit route param)
 *   2. req.user.projectRef (from admin session)
 *   3. req.customer.projectRef (from customer session)
 *   4. req.headers['x-project-ref'] (API header)
 *   5. req.query.projectRef (query string — public routes only)
 */
function attachProjectRef(req, res, next) {
  req.projectRef =
    req.params.projectRef ||
    req.user?.projectRef ||
    req.customer?.projectRef ||
    req.headers['x-project-ref'] ||
    req.query.projectRef ||
    null;

  next();
}

/**
 * Require projectRef to be present.
 */
function requireProjectRef(req, res, next) {
  if (!req.projectRef) {
    return res.status(400).json({ error: 'Project reference is required' });
  }
  next();
}

module.exports = { attachProjectRef, requireProjectRef };
