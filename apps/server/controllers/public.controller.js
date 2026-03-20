'use strict';

const config = require('../config');
const { select } = require('../lib/supabase');
const { mapProduct, mapCategory, mapWorkspace, mapShop } = require('../lib/case');
const platformBannerModel = require('../models/platform-banner.model');
const { pointInPolygon, getEffectiveGeofence, haversineKm } = require('../lib/geo');

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

async function listShops(req, res, next) {
  try {
    const { ref } = req.params;
    const lat = req.query.lat ? parseFloat(req.query.lat) : null;
    const lon = req.query.lon ? parseFloat(req.query.lon) : null;

    const rows = await select('shops', {
      filters: { project_ref: ref, is_active: true },
      order: 'created_at.asc',
    });

    let shops = (rows || []).map(mapShop);

    if (lat != null && lon != null && !isNaN(lat) && !isNaN(lon)) {
      const vendorSettingsModel = require('../models/vendor-settings.model');
      const filtered = [];
      for (const shop of shops) {
        const raw = rows.find((r) => r.id === shop.id);
        if (!raw) continue;
        const settings = await vendorSettingsModel.findByShopId(shop.id);
        const geofence = getEffectiveGeofence(raw, settings);
        if (!geofence) {
          filtered.push(shop);
          continue;
        }
        if (pointInPolygon(lat, lon, geofence)) {
          filtered.push(shop);
        }
      }
      shops = filtered;
    }

    return res.json({ shops });
  } catch (err) {
    next(err);
  }
}

async function shopProducts(req, res, next) {
  try {
    const { ref, shopId } = req.params;

    const shopRows = await select('shops', { filters: { id: shopId, project_ref: ref } });
    const shop = shopRows?.[0];
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    const rows = await select('products', {
      filters: { shop_id: shopId, available: true },
      order: 'sort_order.asc,created_at.desc',
    });
    return res.json({ products: (rows || []).map(mapProduct) });
  } catch (err) {
    next(err);
  }
}

async function shopCategories(req, res, next) {
  try {
    const { ref, shopId } = req.params;

    const shopRows = await select('shops', { filters: { id: shopId, project_ref: ref } });
    if (!shopRows?.[0]) return res.status(404).json({ error: 'Shop not found' });

    const rows = await select('categories', {
      filters: { shop_id: shopId },
      order: 'sort_order.asc,name.asc',
    });
    return res.json({ categories: (rows || []).map(mapCategory) });
  } catch (err) {
    next(err);
  }
}

async function shopDetail(req, res, next) {
  try {
    const { ref, shopId } = req.params;
    const rows = await select('shops', { filters: { id: shopId, project_ref: ref } });
    const shop = rows?.[0];
    if (!shop) return res.status(404).json({ error: 'Shop not found' });
    return res.json({ shop: mapShop(shop) });
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

async function reverseGeocode(req, res, next) {
  try {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: 'lat and lon query params are required' });
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${config.google.mapsApiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    // Google often returns a "Plus Code" like `55PQ+39 Gujranwala, Pakistan` at
    // the start of `formatted_address`. Strip that so the UI shows a cleaner
    // human-readable address.
    const PLUS_CODE_PREFIX_RE = /^([0-9A-Z]{4,6}\+[0-9A-Z]{2,4})(?:,)?\s*/i;
    const stripPlusCodePrefix = (s) => s.replace(PLUS_CODE_PREFIX_RE, "").trim();

    const candidates = (data?.results || [])
      .map((r) => r?.formatted_address)
      .filter((a) => typeof a === "string" && a.trim());

    // Prefer an address that doesn't start with a Plus Code. If everything starts
    // with a Plus Code, strip it as a fallback for nicer UI output.
    let address =
      candidates.find((a) => !PLUS_CODE_PREFIX_RE.test(a)) || candidates[0] || null;
    if (typeof address === "string" && PLUS_CODE_PREFIX_RE.test(address)) {
      address = stripPlusCodePrefix(address);
    }

    return res.json({ address: address || null });
  } catch (err) {
    next(err);
  }
}

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

    const distance = haversineKm(lat, lon, workspace.lat, workspace.lon);
    return res.json({ deliverable: distance <= maxRadius, distance: Math.round(distance * 10) / 10, maxRadius });
  } catch (err) {
    next(err);
  }
}

async function shopDeliveryCheck(req, res, next) {
  try {
    const { ref, shopId } = req.params;
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: 'lat and lon required' });
    }

    const shopRows = await select('shops', { filters: { id: shopId, project_ref: ref } });
    const shop = shopRows?.[0];
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    const vendorSettingsModel = require('../models/vendor-settings.model');
    const settings = await vendorSettingsModel.findByShopId(shopId);
    const geofence = getEffectiveGeofence(shop, settings);

    if (!geofence) {
      return res.json({ deliverable: true, distance: null, maxRadius: 0, note: 'Shop location/geofence not set' });
    }

    const deliverable = pointInPolygon(lat, lon, geofence);
    const distance = (shop.lat && shop.lon)
      ? Math.round(haversineKm(lat, lon, Number(shop.lat), Number(shop.lon)) * 10) / 10
      : null;

    return res.json({ deliverable, distance, maxRadius: settings?.delivery_radius_km || 0 });
  } catch (err) {
    next(err);
  }
}

async function resolveTheme(req, res, next) {
  try {
    const platformThemeModel = require('../models/platform-theme.model');
    const { app, ref } = req.query;
    if (!app) return res.status(400).json({ error: 'app query param is required' });

    let workspaceId = null;
    if (ref) {
      const workspaces = await select('workspaces', { filters: { project_ref: ref }, limit: 1 });
      workspaceId = workspaces?.[0]?.id || null;
    }

    const theme = await platformThemeModel.resolve(app, workspaceId);
    if (!theme) return res.status(204).end();
    return res.json(theme);
  } catch (err) {
    next(err);
  }
}

function parsePublicBannerImageUrls(row) {
  if (!row?.image_urls) return [];
  if (Array.isArray(row.image_urls)) return row.image_urls;
  try {
    const p = typeof row.image_urls === 'string' ? JSON.parse(row.image_urls) : row.image_urls;
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

async function listActiveBanners(req, res, next) {
  try {
    const raw =
      typeof req.query.placement === 'string' ? req.query.placement.trim() : '';
    const placement = raw || 'home_promotions';
    const rows = await platformBannerModel.listActiveByPlacement(placement);
    const banners = (rows || []).map((r) => ({
      id: r.id,
      title: r.title,
      subtitle: r.subtitle,
      ctaText: r.cta_text,
      ctaLink: r.cta_link,
      imageUrl: r.image_url,
      imageUrls: parsePublicBannerImageUrls(r),
      carouselEnabled: r.carousel_enabled ?? false,
      imageScale: r.image_scale ?? 100,
      imageResize: r.image_resize ?? 'center',
      imageAspectPreset: r.image_aspect_preset ?? 'auto',
      placement: r.placement ?? 'home_promotions',
      bgGradient: r.bg_gradient,
      textColor: r.text_color,
      sortOrder: r.sort_order,
    }));
    return res.json({ banners });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  healthCheck,
  publicRead,
  listShops,
  shopProducts,
  shopCategories,
  shopDetail,
  geocode,
  reverseGeocode,
  deliveryCheck,
  shopDeliveryCheck,
  resolveTheme,
  listActiveBanners,
};
