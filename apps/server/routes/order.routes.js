'use strict';

const { Router } = require('express');
const orderController = require('../controllers/order.controller');
const { validate } = require('../middleware/validate.middleware');
const { requireAnyAuth, requireAdmin, requireRole } = require('../middleware/auth.middleware');
const { attachProjectRef, requireProjectRef } = require('../middleware/project-ref.middleware');
const v = require('../validators/order.validator');

const router = Router();

router.use(attachProjectRef, requireProjectRef, requireAnyAuth);

// Customer can list their own orders; staff can list project orders.
router.get('/',         validate(v.listOrdersSchema, 'query'), orderController.listOrders);

// Order creation remains internal (Stripe webhook / staff tooling)
router.post('/',        requireAdmin, validate(v.createOrderSchema),         orderController.createOrder);
router.get('/:id',                                             orderController.getOrder);

// Staff status update endpoint (admin/vendor only)
router.patch('/:id/status', requireRole('admin', 'vendor'), validate(v.updateStatusSchema),   orderController.updateOrderStatus);

// Refunds are admin/vendor only
router.post('/:id/refund',  requireRole('admin', 'vendor'), validate(v.refundSchema),         orderController.refundOrder);

// Cancel can be customer (their own order) or admin/vendor
router.post('/:id/cancel',  validate(v.cancelSchema),         orderController.cancelOrder);

// Vendor-only order flow controls
router.post('/:id/accept',  requireRole('vendor', 'admin'), validate(v.acceptSchema),         orderController.acceptOrder);
router.post('/:id/reject',  requireRole('vendor', 'admin'), validate(v.rejectSchema),         orderController.rejectOrder);
router.post('/:id/extend-sla', requireRole('vendor', 'admin'), validate(v.extendSlaSchema),    orderController.extendSla);

// Rider completes an order after arrival
router.post('/:id/complete', requireRole('rider', 'admin'),                                   orderController.completeOrder);

module.exports = router;
