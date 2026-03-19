'use strict';

const { z } = require('zod');

const updateSettingsSchema = z.object({
  autoAccept: z.boolean().optional(),
  defaultPrepTimeMinutes: z.number().int().min(5).max(120).optional(),
  deliveryMode: z.enum(['third_party', 'vendor_rider']).optional(),
  autoDispatchDelayMinutes: z.number().int().min(0).max(60).optional(),
});

module.exports = { updateSettingsSchema };
