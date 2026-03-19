'use strict';

const { v4: uuidv4 } = require('uuid');
const BaseModel = require('./base.model');

class PlatformBannerModel extends BaseModel {
  constructor() {
    super('platform_banners');
  }

  async listAll() {
    return this.findMany({}, { order: 'sort_order.asc,created_at.desc' });
  }

  async listActive() {
    const now = new Date();
    const rows = await this.findMany({}, { order: 'sort_order.asc,created_at.desc' });
    return (rows || []).filter((r) => {
      if (!r.is_active) return false;
      if (r.starts_at && new Date(r.starts_at) > now) return false;
      if (r.ends_at && new Date(r.ends_at) < now) return false;
      return true;
    });
  }

  async createBanner(data) {
    const now = new Date().toISOString();
    return super.create({
      id: uuidv4(),
      title: data.title,
      subtitle: data.subtitle || null,
      cta_text: data.ctaText || null,
      cta_link: data.ctaLink || null,
      image_url: data.imageUrl || null,
      image_scale: data.imageScale ?? 100,
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
    if (data.imageUrl !== undefined) patch.image_url = data.imageUrl;
    if (data.imageScale !== undefined) patch.image_scale = data.imageScale;
    if (data.bgGradient !== undefined) patch.bg_gradient = data.bgGradient;
    if (data.textColor !== undefined) patch.text_color = data.textColor;
    if (data.sortOrder !== undefined) patch.sort_order = data.sortOrder;
    if (data.isActive !== undefined) patch.is_active = data.isActive;
    if (data.startsAt !== undefined) patch.starts_at = data.startsAt;
    if (data.endsAt !== undefined) patch.ends_at = data.endsAt;
    return this.updateById(id, patch);
  }
}

module.exports = new PlatformBannerModel();
