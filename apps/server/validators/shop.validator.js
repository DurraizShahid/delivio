'use strict';

const { z } = require('zod');

const geoPolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(z.array(z.number()).min(2).max(3))).min(1),
}).optional().nullable();

const createShopSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().max(2000).optional().nullable(),
  logoUrl: z.string().url().max(500).optional().nullable(),
  bannerUrl: z.string().url().max(500).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lon: z.number().min(-180).max(180).optional().nullable(),
  deliveryGeofence: geoPolygonSchema,
  isActive: z.boolean().optional(),
});

const updateShopSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  slug: z.string().min(1).max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens').optional(),
  description: z.string().max(2000).optional().nullable(),
  logoUrl: z.string().url().max(500).optional().nullable(),
  bannerUrl: z.string().url().max(500).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lon: z.number().min(-180).max(180).optional().nullable(),
  deliveryGeofence: geoPolygonSchema,
  isActive: z.boolean().optional(),
});

const assignUserSchema = z.object({
  userId: z.string().uuid(),
});

module.exports = { createShopSchema, updateShopSchema, assignUserSchema, geoPolygonSchema };
