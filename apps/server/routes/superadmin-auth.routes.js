'use strict';

const { Router } = require('express');
const controller = require('../controllers/superadmin-auth.controller');

const router = Router();

router.post('/login',  controller.login);
router.post('/logout', controller.logout);
router.get('/session', controller.getSession);

module.exports = router;
