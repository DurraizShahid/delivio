'use strict';

const { z } = require('zod');

const createIntentSchema = z.object({
  amountCents: z.number().int().positive(),
  currency: z.string().length(3).default('gbp'),
  metadata: z.record(z.string()).optional().default({}),
});

const pushTokenSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['web', 'ios', 'android']),
});

module.exports = { createIntentSchema, pushTokenSchema };
