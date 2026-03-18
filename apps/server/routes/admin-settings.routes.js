'use strict';

const { Router } = require('express');
const controller = require('../controllers/admin-settings.controller');
const { requireRole } = require('../middleware/auth.middleware');

const router = Router();

router.use(requireRole('admin'));
router.get('/', controller.getSettings);
router.patch('/', controller.updateSettings);

module.exports = router;
