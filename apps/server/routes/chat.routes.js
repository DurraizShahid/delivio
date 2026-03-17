'use strict';

const { Router } = require('express');
const chatController = require('../controllers/chat.controller');
const { validate } = require('../middleware/validate.middleware');
const { parseSession, requireAnyAuth } = require('../middleware/auth.middleware');
const { attachProjectRef, requireProjectRef } = require('../middleware/project-ref.middleware');
const v = require('../validators/chat.validator');

const router = Router();

router.use(parseSession, requireAnyAuth, attachProjectRef, requireProjectRef);

router.post('/conversations',                       validate(v.createConversationSchema),           chatController.createConversation);
router.get('/conversations',                                                                         chatController.listConversations);
router.get('/conversations/:id/messages',           validate(v.listMessagesSchema, 'query'),        chatController.getMessages);
router.post('/conversations/:id/messages',          validate(v.sendMessageSchema),                  chatController.sendMessage);
router.patch('/conversations/:id/read',                                                              chatController.markRead);

module.exports = router;
