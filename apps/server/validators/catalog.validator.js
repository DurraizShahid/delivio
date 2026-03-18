'use strict';

const { z } = require('zod');

const createCategorySchema = z.object({
  name: z.string().min(1).max(80),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).max(80).optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
});

const createProductSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional().nullable(),
  priceCents: z.number().int().min(0).max(10_000_00),
  category: z.string().min(1).max(80).optional().nullable(),
  imageUrl: z.string().url().max(500).optional().nullable(),
  available: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
});

const updateProductSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).optional().nullable(),
  priceCents: z.number().int().min(0).max(10_000_00).optional(),
  category: z.string().min(1).max(80).optional().nullable(),
  imageUrl: z.string().url().max(500).optional().nullable(),
  available: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
});

module.exports = {
  createCategorySchema,
  updateCategorySchema,
  createProductSchema,
  updateProductSchema,
};

