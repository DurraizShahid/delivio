'use strict';

const { v4: uuidv4 } = require('uuid');
const BaseModel = require('./base.model');

function parseImageUrls(row) {
  if (!row?.image_urls) return [];
  if (Array.isArray(row.image_urls)) return row.image_urls;
  try {
    const p = typeof row.image_urls === 'string' ? JSON.parse(row.image_urls) : row.image_urls;
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function normalizeImages({ carouselEnabled, imageUrls, imageUrl }) {
  const carousel = !!carouselEnabled;
  const trimmed = (Array.isArray(imageUrls) ? imageUrls : [])
    .map((u) => (typeof u === 'string' ? u.trim() : ''))
    .filter(Boolean);
  const single = imageUrl != null ? String(imageUrl).trim() : '';
  if (carousel) {
    const urls = trimmed.length > 0 ? trimmed : (single ? [single] : []);
    if (urls.length === 0) {
      return {
        carousel_enabled: false,
        image_urls: [],
        image_url: null,
      };
    }
    return {
      carousel_enabled: true,
      image_urls: urls,
      image_url: urls[0] || null,
    };
  }
  const url = single || (trimmed[0] || '');
  return {
    carousel_enabled: false,
    image_urls: [],
    image_url: url || null,
  };
}

class PlatformBannerModel extends BaseModel {
  constructor() {
    super('platform_banners');
  }

  async listAll() {
    return this.findMany({}, { order: 'sort_order.asc,created_at.desc' });
  }

  /**
   * Active banners for a customer page zone (`placement` must match DB constraint).
   */
  async listActiveByPlacement(placement) {
    const now = new Date();
    const rows = await this.findMany(
      { is_active: true, placement },
      { order: 'sort_order.asc,created_at.desc' }
    );
    return (rows || []).filter((r) => {
      if (r.starts_at && new Date(r.starts_at) > now) return false;
      if (r.ends_at && new Date(r.ends_at) < now) return false;
      return true;
    });
  }

  async createBanner(data) {
    const now = new Date().toISOString();
    const img = normalizeImages({
      carouselEnabled: data.carouselEnabled,
      imageUrls: data.imageUrls,
      imageUrl: data.imageUrl,
    });
    return super.create({
      id: uuidv4(),
      title: data.title,
      subtitle: data.subtitle || null,
      cta_text: data.ctaText || null,
      cta_link: data.ctaLink || null,
      image_url: img.image_url,
      image_urls: img.image_urls,
      carousel_enabled: img.carousel_enabled,
      image_scale: data.imageScale ?? 100,
      image_resize: data.imageResize ?? 'center',
      image_aspect_preset: data.imageAspectPreset ?? 'auto',
      placement: data.placement ?? 'home_promotions',
      bg_gradient: data.bgGradient || 'from-primary to-primary/80',
      text_color: data.textColor || '#ffffff',
      sort_order: data.sortOrder ?? 0,
      is_active: data.isActive ?? true,
      starts_at: data.startsAt || null,
      ends_at: data.endsAt || null,
      created_at: now,
      updated_at: now,
    });
  }

  async updateBanner(id, data) {
    const patch = { updated_at: new Date().toISOString() };
    if (data.title !== undefined) patch.title = data.title;
    if (data.subtitle !== undefined) patch.subtitle = data.subtitle;
    if (data.ctaText !== undefined) patch.cta_text = data.ctaText;
    if (data.ctaLink !== undefined) patch.cta_link = data.ctaLink;
    if (data.imageScale !== undefined) patch.image_scale = data.imageScale;
    if (data.imageResize !== undefined) patch.image_resize = data.imageResize;
    if (data.imageAspectPreset !== undefined) patch.image_aspect_preset = data.imageAspectPreset;
    if (data.placement !== undefined) patch.placement = data.placement;
    if (data.bgGradient !== undefined) patch.bg_gradient = data.bgGradient;
    if (data.textColor !== undefined) patch.text_color = data.textColor;
    if (data.sortOrder !== undefined) patch.sort_order = data.sortOrder;
    if (data.isActive !== undefined) patch.is_active = data.isActive;
    if (data.startsAt !== undefined) patch.starts_at = data.startsAt;
    if (data.endsAt !== undefined) patch.ends_at = data.endsAt;

    const touchesImages =
      data.imageUrl !== undefined ||
      data.imageUrls !== undefined ||
      data.carouselEnabled !== undefined;

    if (touchesImages) {
      const existing = await this.findById(id);
      if (!existing) return null;
      const merged = {
        carouselEnabled: data.carouselEnabled !== undefined ? data.carouselEnabled : existing.carousel_enabled,
        imageUrls: data.imageUrls !== undefined ? data.imageUrls : parseImageUrls(existing),
        imageUrl: data.imageUrl !== undefined ? data.imageUrl : existing.image_url,
      };
      const img = normalizeImages(merged);
      patch.image_url = img.image_url;
      patch.image_urls = img.image_urls;
      patch.carousel_enabled = img.carousel_enabled;
    }

    return this.updateById(id, patch);
  }
}

module.exports = new PlatformBannerModel();
