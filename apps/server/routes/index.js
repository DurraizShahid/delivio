'use strict';

const { Router } = require('express');
const { parseSession, requireAnyAuth, requireAdmin } = require('../middleware/auth.middleware');
const { attachProjectRef, requireProjectRef } = require('../middleware/project-ref.middleware');
const { globalLimiter } = require('../middleware/rate-limit.middleware');

const authRoutes            = require('./auth.routes');
const orderRoutes           = require('./order.routes');
const cartRoutes            = require('./cart.routes');
const deliveryRoutes        = require('./delivery.routes');
const paymentRoutes         = require('./payment.routes');
const chatRoutes            = require('./chat.routes');
const pushRoutes            = require('./push.routes');
const workspaceRoutes       = require('./workspace.routes');
const publicRoutes          = require('./public.routes');
const ratingRoutes          = require('./rating.routes');
const tipRoutes             = require('./tip.routes');
const vendorSettingsRoutes  = require('./vendor-settings.routes');
const adminSettingsRoutes   = require('./admin-settings.routes');

const router = Router();

// Global rate limit on all API routes
router.use(globalLimiter);

// Parse session on every request (non-blocking — sets req.user / req.customer if valid)
router.use(parseSession);
router.use(attachProjectRef);

// Mount routers
router.use('/auth',        authRoutes);
router.use('/orders',      orderRoutes);
router.use('/cart',        cartRoutes);
router.use('/deliveries',  deliveryRoutes);
router.use('/chat',        chatRoutes);
router.use('/push',        pushRoutes);
router.use('/workspace',   workspaceRoutes);

// Ratings, tips, vendor settings
router.use('/ratings',          requireAnyAuth, ratingRoutes);
router.use('/tips',             requireAnyAuth, tipRoutes);
router.use('/vendor-settings',  attachProjectRef, requireProjectRef, requireAdmin, vendorSettingsRoutes);
router.use('/admin-settings',  requireAdmin, adminSettingsRoutes);

// Payment routes (webhook uses raw body — must be mounted separately)
router.use('/', paymentRoutes);

// Public routes (no auth required)
router.use('/', publicRoutes);

module.exports = router;
