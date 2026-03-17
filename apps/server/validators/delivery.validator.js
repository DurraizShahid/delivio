'use strict';

const { z } = require('zod');

const updateDeliveryStatusSchema = z.object({
  status: z.enum(['assigned', 'picked_up', 'delivered']),
});

const locationUpdateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360).optional(),
  speed: z.number().min(0).optional(),
});

const listDeliveriesSchema = z.object({
  zoneId: z.string().uuid().optional(),
  status: z.string().optional(),
});

module.exports = { updateDeliveryStatusSchema, locationUpdateSchema, listDeliveriesSchema };
