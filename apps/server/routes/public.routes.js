'use strict';

const { Router } = require('express');
const publicController = require('../controllers/public.controller');

const router = Router();

router.get('/health',             publicController.healthCheck);
router.get('/geocode',            publicController.geocode);
router.get('/public/:ref/delivery-check', publicController.deliveryCheck);
router.get('/public/:ref/:table',         publicController.publicRead);

module.exports = router;
