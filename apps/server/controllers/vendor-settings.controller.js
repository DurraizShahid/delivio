'use strict';

const vendorSettingsModel = require('../models/vendor-settings.model');

async function getSettings(req, res, next) {
  try {
    const settings = req.shopId
      ? await vendorSettingsModel.findByShopId(req.shopId)
      : await vendorSettingsModel.findByProjectRef(req.projectRef);
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
    if (req.body.autoDispatchDelayMinutes !== undefined) data.auto_dispatch_delay_minutes = req.body.autoDispatchDelayMinutes;

    let settings;
    if (req.shopId) {
      settings = await vendorSettingsModel.upsertByShopId(req.shopId, req.projectRef, data);
    } else {
      settings = await vendorSettingsModel.upsert(req.projectRef, data);
    }
    return res.json({ settings: Array.isArray(settings) ? settings[0] : settings });
  } catch (err) {
    next(err);
  }
}

module.exports = { getSettings, updateSettings };
