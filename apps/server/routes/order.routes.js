'use strict';

const { Router } = require('express');
const orderController = require('../controllers/order.controller');
const { validate } = require('../middleware/validate.middleware');
const { requireAdmin, requireAnyAuth } = require('../middleware/auth.middleware');
const { attachProjectRef, requireProjectRef } = require('../middleware/project-ref.middleware');
const v = require('../validators/order.validator');

const router = Router();

router.use(attachProjectRef, requireProjectRef, requireAdmin);

router.get('/',         validate(v.listOrdersSchema, 'query'), orderController.listOrders);
router.post('/',        validate(v.createOrderSchema),         orderController.createOrder);
router.get('/:id',                                             orderController.getOrder);
router.patch('/:id/status', validate(v.updateStatusSchema),   orderController.updateOrderStatus);
router.post('/:id/refund',  validate(v.refundSchema),         orderController.refundOrder);
router.post('/:id/cancel',  validate(v.cancelSchema),         orderController.cancelOrder);

module.exports = router;
