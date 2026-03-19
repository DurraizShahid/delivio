'use strict';

const { Router } = require('express');
const controller = require('../controllers/catalog.controller');
const { validate } = require('../middleware/validate.middleware');
const { requireRole } = require('../middleware/auth.middleware');
const { attachProjectRef, requireProjectRef } = require('../middleware/project-ref.middleware');
const { attachShopId, requireShopId, requireShopAccess } = require('../middleware/shop.middleware');
const v = require('../validators/catalog.validator');

const router = Router();

router.use(attachProjectRef, requireProjectRef, requireRole('vendor', 'admin'), attachShopId, requireShopId, requireShopAccess);

// Categories
router.get('/categories', controller.listCategories);
router.post('/categories', validate(v.createCategorySchema), controller.createCategory);
router.patch('/categories/:id', validate(v.updateCategorySchema), controller.updateCategory);
router.delete('/categories/:id', controller.deleteCategory);

// Products
router.get('/products', controller.listProducts);
router.post('/products', validate(v.createProductSchema), controller.createProduct);
router.patch('/products/:id', validate(v.updateProductSchema), controller.updateProduct);
router.delete('/products/:id', controller.deleteProduct);

module.exports = router;
