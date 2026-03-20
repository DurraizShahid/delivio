'use strict';

const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { select, insert, update, supabaseFetch } = require('../lib/supabase');
const userModel = require('../models/user.model');
const shopModel = require('../models/shop.model');
const platformThemeModel = require('../models/platform-theme.model');
const platformBannerModel = require('../models/platform-banner.model');
const { mapWorkspace, mapShop } = require('../lib/case');
const { PLATFORM_LOGO_PUBLIC_MOUNT } = require('../middleware/platform-logo-upload.middleware');

function publicServerBase(req) {
  if (config.publicServerUrl) return config.publicServerUrl;
  const host = req.get('x-forwarded-host') || req.get('host') || 'localhost:8080';
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
  return `${proto}://${host}`.replace(/\/$/, '');
}

// ─── Workspaces ──────────────────────────────────────────────────────────────

async function listWorkspaces(req, res, next) {
  try {
    const rows = await select('workspaces', { order: 'created_at.desc' });
    return res.json({ workspaces: (rows || []).map(mapWorkspace) });
  } catch (err) {
    next(err);
  }
}

async function createWorkspace(req, res, next) {
  try {
    const { projectRef, name, description, address, phone, lat, lon } = req.body;

    const existing = await select('workspaces', { filters: { project_ref: projectRef }, limit: 1 });
    if (existing?.length) {
      return res.status(409).json({ error: 'Workspace with this project_ref already exists' });
    }

    const row = {
      id: uuidv4(),
      project_ref: projectRef,
      name,
      description: description ?? null,
      address: address ?? null,
      phone: phone ?? null,
      lat: lat ?? null,
      lon: lon ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const rows = await insert('workspaces', [row]);
    const created = Array.isArray(rows) ? rows[0] : rows;
    return res.status(201).json({ workspace: mapWorkspace(created) });
  } catch (err) {
    next(err);
  }
}

async function updateWorkspace(req, res, next) {
  try {
    const { id } = req.params;
    const patch = {};
    if (req.body.name != null) patch.name = req.body.name;
    if (req.body.description !== undefined) patch.description = req.body.description ?? null;
    if (req.body.logoUrl !== undefined) patch.logo_url = req.body.logoUrl ?? null;
    if (req.body.bannerUrl !== undefined) patch.banner_url = req.body.bannerUrl ?? null;
    if (req.body.address !== undefined) patch.address = req.body.address ?? null;
    if (req.body.phone !== undefined) patch.phone = req.body.phone ?? null;
    patch.updated_at = new Date().toISOString();

    const rows = await update('workspaces', patch, { id });
    const updated = Array.isArray(rows) ? rows[0] : rows;
    return res.json({ workspace: mapWorkspace(updated) });
  } catch (err) {
    next(err);
  }
}

async function deleteWorkspace(req, res, next) {
  try {
    const { id } = req.params;
    const { remove } = require('../lib/supabase');

    const rows = await select('workspaces', { filters: { id }, limit: 1 });
    const workspace = rows?.[0];
    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });

    // Shops are removed when their workspace is deleted.
    // Before hard-deleting shops, null-out `shop_id` references to avoid FK restrict failures.
    const shops = await select('shops', { filters: { project_ref: workspace.project_ref }, select: 'id' });
    const shopIds = (shops || []).map((s) => s.id).filter(Boolean);
    if (shopIds.length) {
      const nullOut = (table) => update(table, { shop_id: null }, { shop_id: shopIds });
      await Promise.all([
        nullOut('products'),
        nullOut('categories'),
        nullOut('orders'),
        nullOut('cart_sessions'),
        nullOut('vendor_settings'),
      ]);
    }

    await remove('shops', { project_ref: workspace.project_ref });
    await remove('workspaces', { id });

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// ─── Users ───────────────────────────────────────────────────────────────────

async function listUsers(req, res, next) {
  try {
    const filters = {};
    if (req.query.role) filters.role = req.query.role;
    if (req.query.projectRef) filters.project_ref = req.query.projectRef;

    const rows = await select('app_users', {
      filters,
      order: 'created_at.desc',
      limit: parseInt(req.query.limit, 10) || 100,
      offset: parseInt(req.query.offset, 10) || 0,
    });

    const users = (rows || []).map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      projectRef: u.project_ref,
      totpEnabled: u.totp_enabled,
      createdAt: u.created_at,
    }));

    return res.json({ users });
  } catch (err) {
    next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const { email, password, role, projectRef } = req.body;

    const existing = await userModel.findByEmail(email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const user = await userModel.create({ email, password, role, projectRef });
    return res.status(201).json({ user: userModel.sanitise(user) });
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const patch = {};
    if (req.body.email != null) patch.email = req.body.email;
    if (req.body.role != null) patch.role = req.body.role;
    if (req.body.projectRef != null) patch.project_ref = req.body.projectRef;

    const rows = await update('app_users', patch, { id });
    const updated = Array.isArray(rows) ? rows[0] : rows;
    if (!updated) return res.status(404).json({ error: 'User not found' });

    return res.json({ user: userModel.sanitise(updated) });
  } catch (err) {
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    const { remove } = require('../lib/supabase');
    await remove('app_users', { id });
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// ─── Shops ───────────────────────────────────────────────────────────────────

async function listShops(req, res, next) {
  try {
    const filters = {};
    if (req.query.projectRef) filters.project_ref = req.query.projectRef;
    // By default, superadmin only lists active shops. This keeps "deleted" shops
    // (e.g. workspace deletions that deactivate shops) out of the UI.
    const includeInactive = req.query.includeInactive === 'true';
    if (!includeInactive) filters.is_active = true;

    const rows = await select('shops', {
      filters,
      order: 'created_at.desc',
      limit: parseInt(req.query.limit, 10) || 100,
    });

    return res.json({ shops: (rows || []).map(mapShop) });
  } catch (err) {
    next(err);
  }
}

async function createShop(req, res, next) {
  try {
    const shop = await shopModel.createShop(req.body.projectRef, req.body);
    return res.status(201).json({ shop: mapShop(shop) });
  } catch (err) {
    next(err);
  }
}

async function updateShopSA(req, res, next) {
  try {
    const { id } = req.params;
    const updated = await shopModel.updateShop(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Shop not found' });
    return res.json({ shop: mapShop(updated) });
  } catch (err) {
    next(err);
  }
}

async function deleteShop(req, res, next) {
  try {
    const { id } = req.params;
    const shop = await shopModel.findById(id);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    // Hard-delete shop.
    // Null out `shop_id` references in dependent tables first to avoid FK restrict failures.
    const { remove } = require('../lib/supabase');
    await Promise.all([
      update('products', { shop_id: null }, { shop_id: id }),
      update('categories', { shop_id: null }, { shop_id: id }),
      update('orders', { shop_id: null }, { shop_id: id }),
      update('cart_sessions', { shop_id: null }, { shop_id: id }),
      update('vendor_settings', { shop_id: null }, { shop_id: id }),
    ]);
    await remove('shops', { id });
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// ─── Customers ───────────────────────────────────────────────────────────────

async function listCustomers(req, res, next) {
  try {
    const filters = {};
    if (req.query.projectRef) filters.project_ref = req.query.projectRef;

    const rows = await select('customers', {
      filters,
      order: 'created_at.desc',
      limit: parseInt(req.query.limit, 10) || 100,
      offset: parseInt(req.query.offset, 10) || 0,
    });

    const customers = (rows || []).map((c) => ({
      id: c.id,
      phone: c.phone,
      name: c.name,
      email: c.email,
      projectRef: c.project_ref,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));

    return res.json({ customers });
  } catch (err) {
    next(err);
  }
}

// ─── Orders ──────────────────────────────────────────────────────────────────

async function listOrders(req, res, next) {
  try {
    const filters = {};
    if (req.query.projectRef) filters.project_ref = req.query.projectRef;
    if (req.query.status) filters.status = req.query.status;

    const rows = await select('orders', {
      filters,
      order: 'created_at.desc',
      limit: parseInt(req.query.limit, 10) || 50,
      offset: parseInt(req.query.offset, 10) || 0,
    });

    return res.json({ orders: rows || [] });
  } catch (err) {
    next(err);
  }
}

// ─── Stats ───────────────────────────────────────────────────────────────────

async function getStats(req, res, next) {
  try {
    const [workspaces, shops, users, customers, orders] = await Promise.all([
      select('workspaces', {}),
      select('shops', { filters: { is_active: true } }),
      select('app_users', {}),
      select('customers', {}),
      select('orders', {}),
    ]);

    const totalRevenue = (orders || []).reduce((sum, o) => sum + (o.total_cents || 0), 0);

    return res.json({
      stats: {
        totalWorkspaces: workspaces?.length || 0,
        totalShops: shops?.length || 0,
        totalUsers: users?.length || 0,
        totalCustomers: customers?.length || 0,
        totalOrders: orders?.length || 0,
        totalRevenueCents: totalRevenue,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Themes ──────────────────────────────────────────────────────────────────

const BRANDING_PRUNE_KEYS = [
  'appName',
  'logoUrl',
  'faviconUrl',
  'wordmarkUrl',
  'ogImageUrl',
  'supportEmail',
  'helpUrl',
];

function pruneThemePayload(theme) {
  if (!theme || typeof theme !== 'object') return {};
  const t = { ...theme };
  for (const k of BRANDING_PRUNE_KEYS) {
    if (t[k] === null || t[k] === '') delete t[k];
  }
  return t;
}

function mapTheme(row) {
  if (!row) return row;
  return {
    id: row.id,
    appTarget: row.app_target,
    workspaceId: row.workspace_id || null,
    lightTheme: typeof row.light_theme === 'string' ? JSON.parse(row.light_theme) : row.light_theme,
    darkTheme: typeof row.dark_theme === 'string' ? JSON.parse(row.dark_theme) : row.dark_theme,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listThemes(req, res, next) {
  try {
    const { workspaceId } = req.query;
    let rows;
    if (workspaceId) {
      rows = await platformThemeModel.list(workspaceId);
    } else {
      rows = await platformThemeModel.listPlatformLevel();
    }
    return res.json({ themes: (rows || []).map(mapTheme) });
  } catch (err) {
    next(err);
  }
}

async function upsertTheme(req, res, next) {
  try {
    const { appTarget, workspaceId, lightTheme, darkTheme } = req.body;
    const row = await platformThemeModel.upsert(
      appTarget,
      workspaceId || null,
      pruneThemePayload(lightTheme),
      pruneThemePayload(darkTheme),
    );
    return res.json({ theme: mapTheme(row) });
  } catch (err) {
    next(err);
  }
}

async function deleteTheme(req, res, next) {
  try {
    const { id } = req.params;
    await platformThemeModel.deleteById(id);
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function uploadPlatformLogo(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const base = publicServerBase(req);
    const logoUrl = `${base}${PLATFORM_LOGO_PUBLIC_MOUNT}/${req.file.filename}`;
    return res.status(201).json({ logoUrl });
  } catch (err) {
    next(err);
  }
}

// ─── Banners ─────────────────────────────────────────────────────────────────

function parseBannerImageUrls(row) {
  if (!row?.image_urls) return [];
  if (Array.isArray(row.image_urls)) return row.image_urls;
  try {
    const p = typeof row.image_urls === 'string' ? JSON.parse(row.image_urls) : row.image_urls;
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function mapBanner(row) {
  if (!row) return row;
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    ctaText: row.cta_text,
    ctaLink: row.cta_link,
    imageUrl: row.image_url,
    imageUrls: parseBannerImageUrls(row),
    carouselEnabled: row.carousel_enabled ?? false,
    imageScale: row.image_scale ?? 100,
    imageResize: row.image_resize ?? 'center',
    imageAspectPreset: row.image_aspect_preset ?? 'auto',
    placement: row.placement ?? 'home_promotions',
    bgGradient: row.bg_gradient,
    textColor: row.text_color,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listBanners(req, res, next) {
  try {
    const rows = await platformBannerModel.listAll();
    return res.json({ banners: (rows || []).map(mapBanner) });
  } catch (err) {
    next(err);
  }
}

async function createBanner(req, res, next) {
  try {
    const row = await platformBannerModel.createBanner(req.body);
    return res.status(201).json({ banner: mapBanner(row) });
  } catch (err) {
    next(err);
  }
}

async function updateBanner(req, res, next) {
  try {
    const { id } = req.params;
    const row = await platformBannerModel.updateBanner(id, req.body);
    if (!row) return res.status(404).json({ error: 'Banner not found' });
    return res.json({ banner: mapBanner(row) });
  } catch (err) {
    next(err);
  }
}

async function deleteBanner(req, res, next) {
  try {
    const { id } = req.params;
    await platformBannerModel.deleteById(id);
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listWorkspaces,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  listShops,
  createShop,
  updateShop: updateShopSA,
  deleteShop,
  listCustomers,
  listOrders,
  getStats,
  listThemes,
  upsertTheme,
  deleteTheme,
  uploadPlatformLogo,
  listBanners,
  createBanner,
  updateBanner,
  deleteBanner,
};
