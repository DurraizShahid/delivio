'use strict';

const riderGeofenceModel = require('../models/rider-geofence.model');
const { mapRiderGeofence } = require('../lib/case');

async function getGeofence(req, res, next) {
  try {
    const row = await riderGeofenceModel.findByUserId(req.user.id);
    return res.json({ geofence: row ? mapRiderGeofence(row) : null });
  } catch (err) {
    next(err);
  }
}

async function saveGeofence(req, res, next) {
  try {
    const row = await riderGeofenceModel.upsert(
      req.user.id,
      req.projectRef,
      req.body.geofence
    );
    return res.json({ geofence: mapRiderGeofence(row) });
  } catch (err) {
    next(err);
  }
}

module.exports = { getGeofence, saveGeofence };
