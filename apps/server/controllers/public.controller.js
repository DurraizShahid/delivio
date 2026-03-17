'use strict';

const config = require('../config');
const { select } = require('../lib/supabase');

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
    return res.json({ data: rows || [] });
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

module.exports = { healthCheck, publicRead, geocode };
