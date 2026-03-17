'use strict';

const conversationModel = require('../models/conversation.model');
const messageModel = require('../models/message.model');
const orderModel = require('../models/order.model');
const wsServer = require('../websocket/ws-server');
const notificationService = require('../services/notification.service');
const { createError } = require('../middleware/error.middleware');
const { getCallerId, getCallerRole } = require('../middleware/auth.middleware');
const config = require('../config');

async function createConversation(req, res, next) {
  try {
    const { orderId, type } = req.body;
    const callerId = getCallerId(req);

    // Verify order belongs to this workspace
    const order = await orderModel.findById(orderId);
    if (!order) return next(createError('Order not found', 404));
    if (order.project_ref !== req.projectRef) return next(createError('Access denied', 403));

    // Determine participants based on conversation type
    let participant1Id = callerId;
    let participant2Id;

    if (type === 'customer_vendor') {
      participant2Id = order.customer_id || callerId;
    } else if (type === 'vendor_rider') {
      // For simplicity, vendor starts conversation with assigned rider
      const { select } = require('../lib/supabase');
      const deliveries = await select('deliveries', { filters: { order_id: orderId } });
      const delivery = deliveries?.[0];
      if (!delivery?.rider_id) return next(createError('No rider assigned to this order yet', 400));
      participant2Id = delivery.rider_id;
    } else {
      return next(createError('Invalid conversation type', 400));
    }

    const { conversation, created } = await conversationModel.findOrCreate({
      orderId,
      type,
      participant1Id: participant1Id,
      participant2Id: participant2Id,
      projectRef: req.projectRef,
    });

    return res.status(created ? 201 : 200).json({ conversation });
  } catch (err) {
    next(err);
  }
}

async function listConversations(req, res, next) {
  try {
    const callerId = getCallerId(req);
    const conversations = await conversationModel.findForUser(callerId, req.projectRef);
    return res.json({ conversations });
  } catch (err) {
    next(err);
  }
}

async function getMessages(req, res, next) {
  try {
    const { id } = req.params;
    const callerId = getCallerId(req);
    const { page } = req.query;

    const conversation = await conversationModel.findById(id);
    if (!conversation) return next(createError('Conversation not found', 404));

    // Multi-tenant isolation check
    if (conversation.project_ref !== req.projectRef) {
      return next(createError('Access denied', 403));
    }

    if (!conversationModel.isParticipant(conversation, callerId)) {
      return next(createError('You are not a participant in this conversation', 403));
    }

    const messages = await messageModel.getHistory(id, { page: parseInt(page || '1', 10) });
    return res.json({ messages, page: parseInt(page || '1', 10), pageSize: config.chat.pageSize });
  } catch (err) {
    next(err);
  }
}

async function sendMessage(req, res, next) {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const callerId = getCallerId(req);
    const callerRole = getCallerRole(req);

    // Enforce max length (belt-and-suspenders beyond Zod)
    if (content.length > config.chat.maxMessageLength) {
      return next(createError(`Message exceeds ${config.chat.maxMessageLength} character limit`, 400));
    }

    const conversation = await conversationModel.findById(id);
    if (!conversation) return next(createError('Conversation not found', 404));

    if (conversation.project_ref !== req.projectRef) {
      return next(createError('Access denied', 403));
    }

    if (!conversationModel.isParticipant(conversation, callerId)) {
      return next(createError('You are not a participant in this conversation', 403));
    }

    const message = await messageModel.create({
      conversationId: id,
      senderId: callerId,
      senderRole: callerRole,
      content,
    });

    await conversationModel.touch(id);

    // Broadcast to both participants via WebSocket
    const recipientId = conversationModel.getOtherParticipant(conversation, callerId);

    wsServer.broadcast(req.projectRef, {
      type: 'chat:message',
      conversationId: id,
      message,
    });

    // If recipient has no active WebSocket → push notification
    const recipientOnline = wsServer.isUserOnline(req.projectRef, recipientId);
    if (!recipientOnline && recipientId) {
      const senderName = req.user?.email || req.customer?.name || 'Someone';
      await notificationService.notifyNewMessage(recipientId, senderName, id, req.projectRef);
    }

    return res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
}

async function markRead(req, res, next) {
  try {
    const { id } = req.params;
    const callerId = getCallerId(req);

    const conversation = await conversationModel.findById(id);
    if (!conversation) return next(createError('Conversation not found', 404));

    if (conversation.project_ref !== req.projectRef) {
      return next(createError('Access denied', 403));
    }

    if (!conversationModel.isParticipant(conversation, callerId)) {
      return next(createError('You are not a participant in this conversation', 403));
    }

    await messageModel.markConversationRead(id, callerId);

    wsServer.broadcast(req.projectRef, {
      type: 'chat:read',
      conversationId: id,
      userId: callerId,
      readAt: new Date().toISOString(),
    });

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { createConversation, listConversations, getMessages, sendMessage, markRead };
