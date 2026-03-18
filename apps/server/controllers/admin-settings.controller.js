'use strict';

const adminSettingsModel = require('../models/admin-settings.model');

async function getSettings(req, res, next) {
  try {
    const settings = await adminSettingsModel.get();
    return res.json({
      settings: settings || {
        avg_delivery_time_minutes: 30,
        auto_dispatch_delay_minutes: 5,
        max_search_radius_km: 15.0,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function updateSettings(req, res, next) {
  try {
    const result = await adminSettingsModel.upsert(req.body);
    return res.json({ settings: Array.isArray(result) ? result[0] : result });
  } catch (err) {
    next(err);
  }
}

module.exports = { getSettings, updateSettings };
