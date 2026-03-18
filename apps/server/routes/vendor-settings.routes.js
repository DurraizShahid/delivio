'use strict';

const { Router } = require('express');
const vendorSettingsController = require('../controllers/vendor-settings.controller');
const { validate } = require('../middleware/validate.middleware');
const { requireRole } = require('../middleware/auth.middleware');
const v = require('../validators/vendor-settings.validator');

const router = Router();

router.use(requireRole('vendor', 'admin'));

router.get('/',    vendorSettingsController.getSettings);
router.patch('/',  validate(v.updateSettingsSchema), vendorSettingsController.updateSettings);

module.exports = router;
