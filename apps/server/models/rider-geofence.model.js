'use strict';

const { v4: uuidv4 } = require('uuid');
const BaseModel = require('./base.model');
const { select, insert, update } = require('../lib/supabase');

class RiderGeofenceModel extends BaseModel {
  constructor() {
    super('rider_geofences');
  }

  async findByUserId(userId) {
    const rows = await select(this.table, {
      filters: { user_id: userId },
      limit: 1,
    });
    return rows?.[0] || null;
  }

  async upsert(userId, projectRef, geofence) {
    const now = new Date().toISOString();
    const existing = await this.findByUserId(userId);

    if (existing) {
      const res = await update(this.table, {
        geofence,
        updated_at: now,
      }, { id: existing.id });
      return Array.isArray(res) ? res[0] : res;
    }

    const row = {
      id: uuidv4(),
      user_id: userId,
      project_ref: projectRef,
      geofence,
      created_at: now,
      updated_at: now,
    };
    const res = await insert(this.table, [row]);
    return Array.isArray(res) ? res[0] : res;
  }
}

module.exports = new RiderGeofenceModel();
