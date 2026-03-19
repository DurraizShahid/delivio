'use strict';

const { Router } = require('express');
const controller = require('../controllers/superadmin.controller');
const { validate } = require('../middleware/validate.middleware');
const v = require('../validators/superadmin.validator');

const router = Router();

// Workspaces
router.get('/workspaces', controller.listWorkspaces);
router.post('/workspaces', validate(v.createWorkspaceSchema), controller.createWorkspace);
router.patch('/workspaces/:id', validate(v.updateWorkspaceSchema), controller.updateWorkspace);

// Users
router.get('/users', controller.listUsers);
router.post('/users', validate(v.createUserSchema), controller.createUser);
router.patch('/users/:id', validate(v.updateUserSchema), controller.updateUser);
router.delete('/users/:id', controller.deleteUser);

// Shops
router.get('/shops', controller.listShops);
router.post('/shops', validate(v.createShopSchema), controller.createShop);
router.patch('/shops/:id', validate(v.updateShopSchema), controller.updateShop);

// Customers
router.get('/customers', controller.listCustomers);

// Orders
router.get('/orders', controller.listOrders);

// Stats
router.get('/stats', controller.getStats);

module.exports = router;
