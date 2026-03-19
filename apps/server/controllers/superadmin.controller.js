'use strict';

const { v4: uuidv4 } = require('uuid');
const { select, insert, update, supabaseFetch } = require('../lib/supabase');
const userModel = require('../models/user.model');
const shopModel = require('../models/shop.model');
const { mapWorkspace, mapShop } = require('../lib/case');

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
      select('shops', {}),
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

module.exports = {
  listWorkspaces,
  createWorkspace,
  updateWorkspace,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  listShops,
  createShop,
  updateShop: updateShopSA,
  listCustomers,
  listOrders,
  getStats,
};
