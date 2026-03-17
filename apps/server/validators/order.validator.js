'use strict';

const { z } = require('zod');

const orderItemSchema = z.object({
  productId: z.string().uuid().optional(),
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPriceCents: z.number().int().positive(),
});

const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'Order must have at least one item'),
  totalCents: z.number().int().positive(),
  paymentIntentId: z.string().optional(),
  scheduledFor: z.string().datetime().optional(),
  customerId: z.string().uuid().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum([
    'pending', 'accepted_by_vendor', 'preparing', 'ready',
    'picked_up', 'delivered', 'cancelled', 'scheduled',
  ]),
});

const refundSchema = z.object({
  amountCents: z.number().int().positive().optional(),
  reason: z.string().max(500).optional(),
});

const cancelSchema = z.object({
  reason: z.string().max(500).optional(),
  initiator: z.enum(['customer', 'vendor', 'admin']).optional(),
});

const listOrdersSchema = z.object({
  status: z.string().optional(),
  customerId: z.string().uuid().optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

module.exports = {
  createOrderSchema,
  updateStatusSchema,
  refundSchema,
  cancelSchema,
  listOrdersSchema,
};
