'use strict';

const { z } = require('zod');
const config = require('../config');

const createConversationSchema = z.object({
  orderId: z.string().uuid(),
  type: z.enum(['customer_vendor', 'vendor_rider']),
});

const sendMessageSchema = z.object({
  content: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(config.chat.maxMessageLength, `Message cannot exceed ${config.chat.maxMessageLength} characters`),
});

const listMessagesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
});

module.exports = { createConversationSchema, sendMessageSchema, listMessagesSchema };
