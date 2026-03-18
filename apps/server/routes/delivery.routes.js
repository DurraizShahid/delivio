'use strict';

const { Router } = require('express');
const deliveryController = require('../controllers/delivery.controller');
const { validate } = require('../middleware/validate.middleware');
const { requireAdmin, requireRole } = require('../middleware/auth.middleware');
const { attachProjectRef, requireProjectRef } = require('../middleware/project-ref.middleware');
const v = require('../validators/delivery.validator');

const router = Router();

router.use(attachProjectRef, requireProjectRef, requireAdmin);

// Rider-specific routes
router.get('/rider/deliveries',   requireRole('rider', 'admin'), validate(v.listDeliveriesSchema, 'query'), deliveryController.listDeliveries);
router.post('/:id/claim',         requireRole('rider', 'admin'),                                     deliveryController.claimDelivery);
router.post('/rider/location',    requireRole('rider', 'admin'), validate(v.locationUpdateSchema),    deliveryController.updateRiderAvailability);

// Status and location
router.post('/:id/status',        requireRole('rider', 'admin'), validate(v.updateDeliveryStatusSchema),    deliveryController.updateDeliveryStatus);
router.post('/:id/location',      requireRole('rider', 'admin'), validate(v.locationUpdateSchema),          deliveryController.updateLocation);
router.get('/:id/location',       requireRole('rider', 'admin', 'vendor'),                                 deliveryController.getLocation);
router.post('/:id/arrived',       requireRole('rider', 'admin'),                                           deliveryController.riderArrived);

// Vendor/admin assignment controls
router.post('/:id/assign',        requireRole('vendor', 'admin'),                                          deliveryController.assignRider);
router.post('/:id/reassign',      requireRole('vendor', 'admin'),                                          deliveryController.reassignDelivery);
router.post('/:id/assign-external', requireRole('vendor', 'admin'), validate(v.assignExternalSchema),      deliveryController.assignExternalRider);

module.exports = router;
