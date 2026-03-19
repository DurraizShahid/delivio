'use strict';

const { Router } = require('express');
const controller = require('../controllers/rider-geofence.controller');
const { validate } = require('../middleware/validate.middleware');
const { requireRole } = require('../middleware/auth.middleware');
const { attachProjectRef, requireProjectRef } = require('../middleware/project-ref.middleware');
const v = require('../validators/rider-geofence.validator');

const router = Router();

router.use(attachProjectRef, requireProjectRef, requireRole('rider'));

router.get('/', controller.getGeofence);
router.put('/', validate(v.saveGeofenceSchema), controller.saveGeofence);

module.exports = router;
