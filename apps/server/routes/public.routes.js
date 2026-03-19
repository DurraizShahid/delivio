'use strict';

const { Router } = require('express');
const publicController = require('../controllers/public.controller');

const router = Router();

router.get('/health',             publicController.healthCheck);
router.get('/geocode',            publicController.geocode);
router.get('/reverse-geocode',   publicController.reverseGeocode);

// Theme resolution (no auth, must be before parametric :ref routes)
router.get('/public/theme', publicController.resolveTheme);

// Active promotional banners (no auth)
router.get('/public/banners', publicController.listActiveBanners);

// Shop-scoped public routes
router.get('/public/:ref/shops',                          publicController.listShops);
router.get('/public/:ref/shops/:shopId',                  publicController.shopDetail);
router.get('/public/:ref/shops/:shopId/products',         publicController.shopProducts);
router.get('/public/:ref/shops/:shopId/categories',       publicController.shopCategories);
router.get('/public/:ref/shops/:shopId/delivery-check',   publicController.shopDeliveryCheck);

// Legacy routes (kept for backward compatibility)
router.get('/public/:ref/delivery-check', publicController.deliveryCheck);
router.get('/public/:ref/:table',         publicController.publicRead);

module.exports = router;
