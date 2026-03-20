'use strict';

const { Router } = require('express');
const tipController = require('../controllers/tip.controller');
const { validate } = require('../middleware/validate.middleware');
const { requireAnyAuth, requireAdmin, requireRole } = require('../middleware/auth.middleware');
const v = require('../validators/tip.validator');

const router = Router();

router.post('/',               requireAnyAuth, validate(v.createTipSchema), tipController.createTip);
router.get('/me',              requireAdmin, requireRole('rider'),          tipController.getMyTips);
router.get('/rider/:riderId',  requireAdmin,                                tipController.getRiderTips);

module.exports = router;
