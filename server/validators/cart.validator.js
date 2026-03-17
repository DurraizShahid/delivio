'use strict';

const { z } = require('zod');

const addItemSchema = z.object({
  productId: z.string().uuid().optional(),
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPriceCents: z.number().int().positive(),
});

const updateItemSchema = z.object({
  quantity: z.number().int().min(0),
});

const mergeCartSchema = z.object({
  guestSessionId: z.string().min(1),
});

module.exports = { addItemSchema, updateItemSchema, mergeCartSchema };
