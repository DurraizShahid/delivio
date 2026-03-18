'use strict';

const config = require('../config');
const { select } = require('../lib/supabase');
const { mapProduct, mapCategory, mapWorkspace } = require('../lib/case');

async function healthCheck(req, res) {
  return res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    env: config.env,
  });
}

async function publicRead(req, res, next) {
  try {
    const { ref, table } = req.params;

    const ALLOWED_PUBLIC_TABLES = [
      'products', 'categories', 'menus', 'workspaces',
      'orders', 'deliveries',
    ];

    if (!ALLOWED_PUBLIC_TABLES.includes(table)) {
      return res.status(403).json({ error: 'Table not publicly accessible' });
    }

    const filters = { project_ref: ref };

    // For orders/deliveries, require an orderId filter to prevent mass data exposure
    if ((table === 'orders' || table === 'deliveries') && !req.query.orderId) {
      return res.status(400).json({ error: 'orderId filter is required for this table' });
    }
    if (req.query.orderId) {
      if (table === 'deliveries') filters.order_id = req.query.orderId;
      else filters.id = req.query.orderId;
    }

    const rows = await select(table, { filters });
    const data = (rows || []).map((r) => {
      if (table === 'products') return mapProduct(r);
      if (table === 'categories') return mapCategory(r);
      if (table === 'workspaces') return mapWorkspace(r);
      return r;
    });
    return res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function geocode(req, res, next) {
  try {
    const { address } = req.query;
    if (!address) return res.status(400).json({ error: 'address query param is required' });

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${config.google.mapsApiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    return res.json(data);
  } catch (err) {
    next(err);
  }
}

// ─── Delivery Check (Geo-fence) ─────────────────────────────────────────────

async function deliveryCheck(req, res, next) {
  try {
    const { ref } = req.params;
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: 'lat and lon required' });
    }

    const vendorSettingsModel = require('../models/vendor-settings.model');
    const settings = await vendorSettingsModel.findByProjectRef(ref);
    const maxRadius = settings?.delivery_radius_km || 5.0;

    const workspaces = await select('workspaces', { filters: { project_ref: ref } });
    const workspace = workspaces?.[0];

    if (!workspace?.lat || !workspace?.lon) {
      return res.json({ deliverable: true, distance: null, maxRadius, note: 'Vendor location not set' });
    }

    const distance = haversine(lat, lon, workspace.lat, workspace.lon);
    return res.json({ deliverable: distance <= maxRadius, distance: Math.round(distance * 10) / 10, maxRadius });
  } catch (err) {
    next(err);
  }
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = { healthCheck, publicRead, geocode, deliveryCheck };
