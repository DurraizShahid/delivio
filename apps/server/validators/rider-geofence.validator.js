'use strict';

const { z } = require('zod');

const saveGeofenceSchema = z.object({
  geofence: z.object({
    type: z.literal('Polygon'),
    coordinates: z.array(z.array(z.array(z.number()).min(2).max(3))).min(1),
  }),
});

module.exports = { saveGeofenceSchema };
