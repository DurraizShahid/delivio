'use strict';

const { Router } = require('express');
const controller = require('../controllers/shop.controller');
const { validate } = require('../middleware/validate.middleware');
const { requireRole, requireAdmin } = require('../middleware/auth.middleware');
const { attachProjectRef, requireProjectRef } = require('../middleware/project-ref.middleware');
const v = require('../validators/shop.validator');

const router = Router();

router.use(attachProjectRef, requireProjectRef, requireRole('vendor', 'admin'));

router.get('/', controller.listShops);
router.post('/', requireAdmin, validate(v.createShopSchema), controller.createShop);
router.get('/:shopId', controller.getShop);
router.patch('/:shopId', requireAdmin, validate(v.updateShopSchema), controller.updateShop);
router.delete('/:shopId', requireAdmin, controller.deleteShop);

router.get('/:shopId/users', requireAdmin, controller.listShopUsers);
router.post('/:shopId/users', requireAdmin, validate(v.assignUserSchema), controller.assignUser);
router.delete('/:shopId/users/:userId', requireAdmin, controller.removeUser);

module.exports = router;
