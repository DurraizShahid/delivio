'use strict';

const shopModel = require('../models/shop.model');
const userShopModel = require('../models/user-shop.model');
const userModel = require('../models/user.model');
const { createError } = require('../middleware/error.middleware');
const { mapShop } = require('../lib/case');

async function listShops(req, res, next) {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const shops = await shopModel.findByProjectRef(req.projectRef, { includeInactive });
    return res.json({ shops: (shops || []).map(mapShop) });
  } catch (err) {
    next(err);
  }
}

async function getShop(req, res, next) {
  try {
    const shop = await shopModel.findById(req.params.shopId);
    if (!shop) return next(createError('Shop not found', 404));
    if (shop.project_ref !== req.projectRef) return next(createError('Access denied', 403));
    return res.json({ shop: mapShop(shop) });
  } catch (err) {
    next(err);
  }
}

async function createShop(req, res, next) {
  try {
    const shop = await shopModel.createShop(req.projectRef, req.body);

    // Auto-assign the creator to the new shop so they can see/manage it
    if (req.user?.id) {
      await userShopModel.assignUser(req.user.id, shop.id).catch(() => {});
    }

    // Also assign all other vendor/admin users in the workspace to the new shop
    const projectUsers = await userModel.findByProjectRef(req.projectRef);
    for (const u of (projectUsers || [])) {
      if (u.id !== req.user?.id && (u.role === 'vendor' || u.role === 'admin')) {
        await userShopModel.assignUser(u.id, shop.id).catch(() => {});
      }
    }

    return res.status(201).json({ shop: mapShop(shop) });
  } catch (err) {
    next(err);
  }
}

async function updateShop(req, res, next) {
  try {
    const shop = await shopModel.findById(req.params.shopId);
    if (!shop) return next(createError('Shop not found', 404));
    if (shop.project_ref !== req.projectRef) return next(createError('Access denied', 403));
    const updated = await shopModel.updateShop(req.params.shopId, req.body);
    if (!updated) return next(createError('Failed to update shop', 500));
    return res.json({ shop: mapShop(updated) });
  } catch (err) {
    next(err);
  }
}

async function deleteShop(req, res, next) {
  try {
    const shop = await shopModel.findById(req.params.shopId);
    if (!shop) return next(createError('Shop not found', 404));
    if (shop.project_ref !== req.projectRef) return next(createError('Access denied', 403));
    await shopModel.updateShop(req.params.shopId, { isActive: false });
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function listShopUsers(req, res, next) {
  try {
    const assignments = await userShopModel.findByShopId(req.params.shopId);
    const userIds = (assignments || []).map((a) => a.user_id);
    if (!userIds.length) return res.json({ users: [] });

    const users = [];
    for (const uid of userIds) {
      const u = await userModel.findById(uid);
      if (u) users.push({ id: u.id, email: u.email, role: u.role });
    }
    return res.json({ users });
  } catch (err) {
    next(err);
  }
}

async function assignUser(req, res, next) {
  try {
    const { userId } = req.body;
    const user = await userModel.findById(userId);
    if (!user) return next(createError('User not found', 404));
    if (user.project_ref !== req.projectRef) return next(createError('User does not belong to this workspace', 403));
    await userShopModel.assignUser(userId, req.params.shopId);
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function removeUser(req, res, next) {
  try {
    await userShopModel.removeUser(req.params.userId, req.params.shopId);
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listShops,
  getShop,
  createShop,
  updateShop,
  deleteShop,
  listShopUsers,
  assignUser,
  removeUser,
};
