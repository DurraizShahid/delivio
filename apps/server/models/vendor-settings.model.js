'use strict';

const { v4: uuidv4 } = require('uuid');
const BaseModel = require('./base.model');
const { select, insert, update } = require('../lib/supabase');

const VALID_DELIVERY_MODES = ['third_party', 'vendor_rider'];

class VendorSettingsModel extends BaseModel {
  constructor() {
    super('vendor_settings');
  }

  async findByShopId(shopId) {
    const rows = await select(this.table, {
      filters: { shop_id: shopId },
      limit: 1,
    });
    return rows?.[0] || null;
  }

  /** @deprecated Use findByShopId(shopId) instead */
  async findByProjectRef(projectRef) {
    const rows = await select(this.table, {
      filters: { project_ref: projectRef },
      limit: 1,
    });
    return rows?.[0] || null;
  }

  async upsertByShopId(shopId, projectRef, settings) {
    const now = new Date().toISOString();
    const existing = await this.findByShopId(shopId);

    if (settings.delivery_mode && !VALID_DELIVERY_MODES.includes(settings.delivery_mode)) {
      throw new Error(`Invalid delivery_mode: ${settings.delivery_mode}`);
    }

    if (existing) {
      return update(this.table, {
        ...settings,
        updated_at: now,
      }, { id: existing.id });
    }

    return super.create({
      id: uuidv4(),
      project_ref: projectRef,
      shop_id: shopId,
      auto_accept: settings.auto_accept ?? false,
      default_prep_time_minutes: settings.default_prep_time_minutes ?? 20,
      delivery_mode: settings.delivery_mode ?? 'third_party',
      delivery_radius_km: settings.delivery_radius_km ?? 5.0,
      created_at: now,
      updated_at: now,
    });
  }

  /** @deprecated Use upsertByShopId instead */
  async upsert(projectRef, settings) {
    const now = new Date().toISOString();
    const existing = await this.findByProjectRef(projectRef);

    if (settings.delivery_mode && !VALID_DELIVERY_MODES.includes(settings.delivery_mode)) {
      throw new Error(`Invalid delivery_mode: ${settings.delivery_mode}`);
    }

    if (existing) {
      return update(this.table, {
        ...settings,
        updated_at: now,
      }, { id: existing.id });
    }

    return super.create({
      id: uuidv4(),
      project_ref: projectRef,
      auto_accept: settings.auto_accept ?? false,
      default_prep_time_minutes: settings.default_prep_time_minutes ?? 20,
      delivery_mode: settings.delivery_mode ?? 'third_party',
      delivery_radius_km: settings.delivery_radius_km ?? 5.0,
      created_at: now,
      updated_at: now,
    });
  }
}

module.exports = new VendorSettingsModel();
