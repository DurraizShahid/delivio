'use strict';

const pushTokenModel = require('../models/push-token.model');
const { getCallerId, getCallerRole } = require('../middleware/auth.middleware');

async function registerToken(req, res, next) {
  try {
    const { token, platform } = req.body;
    const userId = getCallerId(req);
    const userRole = getCallerRole(req);

    await pushTokenModel.upsert({ userId, userRole, token, platform, projectRef: req.projectRef });
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function unregisterToken(req, res, next) {
  try {
    const userId = getCallerId(req);
    const { platform } = req.query;
    await pushTokenModel.removeToken(userId, platform);
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { registerToken, unregisterToken };
