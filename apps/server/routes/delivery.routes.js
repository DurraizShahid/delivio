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
router.get('/rider/deliveries',   validate(v.listDeliveriesSchema, 'query'), deliveryController.listDeliveries);
router.post('/:id/claim',                                                    deliveryController.claimDelivery);

// Status and location
router.post('/:id/status',        validate(v.updateDeliveryStatusSchema),    deliveryController.updateDeliveryStatus);
router.post('/:id/location',      validate(v.locationUpdateSchema),          deliveryController.updateLocation);
router.get('/:id/location',                                                  deliveryController.getLocation);
router.post('/:id/arrived',                                                  deliveryController.riderArrived);
router.post('/:id/assign',                                                   deliveryController.assignRider);
router.post('/:id/reassign',                                                 deliveryController.reassignDelivery);
router.post('/:id/assign-external', validate(v.assignExternalSchema),        deliveryController.assignExternalRider);

module.exports = router;
