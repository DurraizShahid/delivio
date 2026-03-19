'use strict';

function mapProduct(row) {
  if (!row) return row;
  return {
    id: row.id,
    projectRef: row.project_ref ?? row.projectRef,
    shopId: row.shop_id ?? row.shopId ?? undefined,
    name: row.name,
    description: row.description ?? undefined,
    priceCents: row.price_cents ?? row.priceCents,
    category: row.category ?? undefined,
    imageUrl: row.image_url ?? row.imageUrl ?? undefined,
    available: row.available ?? true,
    sortOrder: row.sort_order ?? row.sortOrder ?? 0,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  };
}

function mapCategory(row) {
  if (!row) return row;
  return {
    id: row.id,
    projectRef: row.project_ref ?? row.projectRef,
    shopId: row.shop_id ?? row.shopId ?? undefined,
    name: row.name,
    sortOrder: row.sort_order ?? row.sortOrder ?? 0,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  };
}

function mapWorkspace(row) {
  if (!row) return row;
  return {
    id: row.id,
    projectRef: row.project_ref ?? row.projectRef,
    name: row.name,
    description: row.description ?? undefined,
    logoUrl: row.logo_url ?? row.logoUrl ?? undefined,
    bannerUrl: row.banner_url ?? row.bannerUrl ?? undefined,
    address: row.address ?? undefined,
    phone: row.phone ?? undefined,
    lat: row.lat,
    lon: row.lon,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  };
}

function mapShop(row) {
  if (!row) return row;
  return {
    id: row.id,
    projectRef: row.project_ref ?? row.projectRef,
    name: row.name,
    slug: row.slug,
    description: row.description ?? undefined,
    logoUrl: row.logo_url ?? row.logoUrl ?? undefined,
    bannerUrl: row.banner_url ?? row.bannerUrl ?? undefined,
    address: row.address ?? undefined,
    phone: row.phone ?? undefined,
    lat: row.lat != null ? Number(row.lat) : undefined,
    lon: row.lon != null ? Number(row.lon) : undefined,
    deliveryGeofence: row.delivery_geofence ?? row.deliveryGeofence ?? null,
    isActive: row.is_active ?? row.isActive ?? true,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  };
}

function mapRiderGeofence(row) {
  if (!row) return row;
  return {
    id: row.id,
    userId: row.user_id ?? row.userId,
    projectRef: row.project_ref ?? row.projectRef,
    geofence: row.geofence,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  };
}

function mapPlatformTheme(row) {
  if (!row) return row;
  return {
    id: row.id,
    appTarget: row.app_target ?? row.appTarget,
    workspaceId: row.workspace_id ?? row.workspaceId ?? null,
    lightTheme: typeof row.light_theme === 'string' ? JSON.parse(row.light_theme) : (row.light_theme ?? row.lightTheme),
    darkTheme: typeof row.dark_theme === 'string' ? JSON.parse(row.dark_theme) : (row.dark_theme ?? row.darkTheme),
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  };
}

module.exports = { mapProduct, mapCategory, mapWorkspace, mapShop, mapRiderGeofence, mapPlatformTheme };
