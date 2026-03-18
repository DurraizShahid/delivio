'use strict';

const BaseModel = require('./base.model');
const { select, insert, update } = require('../lib/supabase');
const { v4: uuidv4 } = require('uuid');

class AdminSettingsModel extends BaseModel {
  constructor() {
    super('admin_settings');
  }

  async get() {
    const rows = await select(this.table, { limit: 1 });
    return rows?.[0] || null;
  }

  async upsert(settings) {
    const existing = await this.get();
    if (existing) {
      return update(this.table, {
        ...settings,
        updated_at: new Date().toISOString(),
      }, { id: existing.id });
    }
    return insert(this.table, {
      id: uuidv4(),
      ...settings,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }
}

module.exports = new AdminSettingsModel();
