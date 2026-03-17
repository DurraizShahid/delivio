'use strict';

const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const { validate } = require('../middleware/validate.middleware');
const { requireAdmin, parseSession } = require('../middleware/auth.middleware');
const { authLimiter, otpSendLimiter } = require('../middleware/rate-limit.middleware');
const v = require('../validators/auth.validator');

const router = Router();

// All auth routes get the stricter auth rate limiter
router.use(authLimiter);

// ─── Admin Auth ───────────────────────────────────────────────────────────────
router.post('/login',           validate(v.loginSchema),           authController.login);
router.post('/logout',          parseSession,                      authController.logout);
router.get('/session',          parseSession, requireAdmin,        authController.getSession);
router.post('/signup',          validate(v.signupSchema),          authController.signup);

// ─── Password Reset ───────────────────────────────────────────────────────────
router.post('/forgot-password', validate(v.forgotPasswordSchema),  authController.forgotPassword);
router.post('/reset-password',  validate(v.resetPasswordSchema),   authController.resetPassword);

// ─── Customer OTP Auth ────────────────────────────────────────────────────────
router.post('/otp/send',        otpSendLimiter, validate(v.otpSendSchema),   authController.sendOTP);
router.post('/otp/verify',      validate(v.otpVerifySchema),                 authController.verifyOTP);
router.get('/customer/session', parseSession,                                authController.getCustomerSession);
router.post('/customer/logout', parseSession,                                authController.customerLogout);

// ─── Two-Factor Auth (TOTP) ───────────────────────────────────────────────────
router.post('/2fa/setup',       parseSession, requireAdmin, validate(v.totpSetupSchema), authController.setup2FA);
router.post('/2fa/verify',      parseSession, requireAdmin, validate(v.totpVerifySchema), authController.verify2FA);
router.post('/2fa/login',       validate(v.totpLoginSchema), authController.login2FA);

module.exports = router;
