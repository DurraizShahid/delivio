'use strict';

const vendorSettingsModel = require('../models/vendor-settings.model');

async function getSettings(req, res, next) {
  try {
    const settings = await vendorSettingsModel.findByProjectRef(req.projectRef);
    return res.json({ settings: settings || null });
  } catch (err) {
    next(err);
  }
}

async function updateSettings(req, res, next) {
  try {
    const data = {};
    if (req.body.autoAccept !== undefined) data.auto_accept = req.body.autoAccept;
    if (req.body.defaultPrepTimeMinutes !== undefined) data.default_prep_time_minutes = req.body.defaultPrepTimeMinutes;
    if (req.body.deliveryMode !== undefined) data.delivery_mode = req.body.deliveryMode;
    if (req.body.deliveryRadiusKm !== undefined) data.delivery_radius_km = req.body.deliveryRadiusKm;

    const settings = await vendorSettingsModel.upsert(req.projectRef, data);
    return res.json({ settings: Array.isArray(settings) ? settings[0] : settings });
  } catch (err) {
    next(err);
  }
}

module.exports = { getSettings, updateSettings };
