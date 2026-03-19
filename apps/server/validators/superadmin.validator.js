'use strict';

const { z } = require('zod');

const createWorkspaceSchema = z.object({
  projectRef: z.string().min(1).max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lon: z.number().min(-180).max(180).optional().nullable(),
});

const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  logoUrl: z.string().url().max(500).optional().nullable(),
  bannerUrl: z.string().url().max(500).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
});

const createUserSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(6).max(100),
  role: z.enum(['admin', 'vendor', 'rider']),
  projectRef: z.string().min(1).max(60),
});

const updateUserSchema = z.object({
  email: z.string().email().max(200).optional(),
  role: z.enum(['admin', 'vendor', 'rider']).optional(),
  projectRef: z.string().min(1).max(60).optional(),
});

const createShopSchema = z.object({
  projectRef: z.string().min(1).max(60),
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().max(2000).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lon: z.number().min(-180).max(180).optional().nullable(),
});

const updateShopSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  slug: z.string().min(1).max(60).optional(),
  description: z.string().max(2000).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  isActive: z.boolean().optional(),
});

const themeColorsSchema = z.object({
  primary: z.string().max(100).optional(),
  primaryForeground: z.string().max(100).optional(),
  secondary: z.string().max(100).optional(),
  secondaryForeground: z.string().max(100).optional(),
  accent: z.string().max(100).optional(),
  accentForeground: z.string().max(100).optional(),
  background: z.string().max(100).optional(),
  foreground: z.string().max(100).optional(),
  muted: z.string().max(100).optional(),
  mutedForeground: z.string().max(100).optional(),
  destructive: z.string().max(100).optional(),
  card: z.string().max(100).optional(),
  cardForeground: z.string().max(100).optional(),
  border: z.string().max(100).optional(),
});

const upsertThemeSchema = z.object({
  appTarget: z.enum([
    'global',
    'customer_web', 'rider_web', 'vendor_web', 'superadmin_web',
    'customer_mobile', 'rider_mobile', 'vendor_mobile',
  ]),
  workspaceId: z.string().uuid().optional().nullable(),
  lightTheme: themeColorsSchema,
  darkTheme: themeColorsSchema,
});

const createBannerSchema = z.object({
  title: z.string().min(1).max(200),
  subtitle: z.string().max(500).optional().nullable(),
  ctaText: z.string().max(100).optional().nullable(),
  ctaLink: z.string().max(500).optional().nullable(),
  imageUrl: z.string().max(500).optional().nullable(),
  imageScale: z.number().int().min(50).max(200).optional(),
  bgGradient: z.string().max(200).optional(),
  textColor: z.string().max(50).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  startsAt: z.string().max(100).optional().nullable(),
  endsAt: z.string().max(100).optional().nullable(),
});

const updateBannerSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  subtitle: z.string().max(500).optional().nullable(),
  ctaText: z.string().max(100).optional().nullable(),
  ctaLink: z.string().max(500).optional().nullable(),
  imageUrl: z.string().max(500).optional().nullable(),
  imageScale: z.number().int().min(50).max(200).optional(),
  bgGradient: z.string().max(200).optional(),
  textColor: z.string().max(50).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  startsAt: z.string().max(100).optional().nullable(),
  endsAt: z.string().max(100).optional().nullable(),
});

module.exports = {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  createUserSchema,
  updateUserSchema,
  createShopSchema,
  updateShopSchema,
  upsertThemeSchema,
  createBannerSchema,
  updateBannerSchema,
};
