'use strict';

const { Router } = require('express');
const controller = require('../controllers/superadmin.controller');
const { validate } = require('../middleware/validate.middleware');
const v = require('../validators/superadmin.validator');
const { platformLogoUpload } = require('../middleware/platform-logo-upload.middleware');

const router = Router();

// Workspaces
router.get('/workspaces', controller.listWorkspaces);
router.post('/workspaces', validate(v.createWorkspaceSchema), controller.createWorkspace);
router.patch('/workspaces/:id', validate(v.updateWorkspaceSchema), controller.updateWorkspace);
router.delete('/workspaces/:id', controller.deleteWorkspace);

// Users
router.get('/users', controller.listUsers);
router.post('/users', validate(v.createUserSchema), controller.createUser);
router.patch('/users/:id', validate(v.updateUserSchema), controller.updateUser);
router.delete('/users/:id', controller.deleteUser);

// Shops
router.get('/shops', controller.listShops);
router.post('/shops', validate(v.createShopSchema), controller.createShop);
router.patch('/shops/:id', validate(v.updateShopSchema), controller.updateShop);
router.delete('/shops/:id', controller.deleteShop);

// Customers
router.get('/customers', controller.listCustomers);

// Orders
router.get('/orders', controller.listOrders);

// Stats
router.get('/stats', controller.getStats);

// Themes
router.get('/themes', controller.listThemes);
router.put('/themes', validate(v.upsertThemeSchema), controller.upsertTheme);
router.delete('/themes/:id', controller.deleteTheme);

// Platform branding asset
router.post('/platform-logo', platformLogoUpload, controller.uploadPlatformLogo);

// Banners
router.get('/banners', controller.listBanners);
router.post('/banners', validate(v.createBannerSchema), controller.createBanner);
router.patch('/banners/:id', validate(v.updateBannerSchema), controller.updateBanner);
router.delete('/banners/:id', controller.deleteBanner);

module.exports = router;
