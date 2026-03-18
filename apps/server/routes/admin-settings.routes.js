'use strict';

const { Router } = require('express');
const controller = require('../controllers/admin-settings.controller');

const router = Router();

router.get('/', controller.getSettings);
router.patch('/', controller.updateSettings);

module.exports = router;
