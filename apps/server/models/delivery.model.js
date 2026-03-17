'use strict';

const { v4: uuidv4 } = require('uuid');
const BaseModel = require('./base.model');
const { select, insert, update } = require('../lib/supabase');

const VALID_STATUSES = ['assigned', 'picked_up', 'delivered'];

class DeliveryModel extends BaseModel {
  constructor() {
    super('deliveries');
  }

  async findByOrderId(orderId) {
    const rows = await select(this.table, { filters: { order_id: orderId } });
    return rows?.[0] || null;
  }

  async findForRider(riderId, zoneId) {
    const filters = { rider_id: riderId };
    if (zoneId) filters.zone_id = zoneId;
    return this.findMany(filters, { order: 'created_at.desc' });
  }

  async findAvailable(projectRef) {
    // Available = not yet claimed (rider_id is null)
    const { supabaseFetch } = require('../lib/supabase');
    return supabaseFetch(
      `/rest/v1/${this.table}?rider_id=is.null&select=*,orders!inner(project_ref)&orders.project_ref=eq.${encodeURIComponent(projectRef)}`
    );
  }

  async create({ orderId, etaMinutes, zoneId }) {
    return super.create({
      id: uuidv4(),
      order_id: orderId,
      rider_id: null,
      status: 'assigned',
      zone_id: zoneId || null,
      eta_minutes: etaMinutes || null,
      created_at: new Date().toISOString(),
    });
  }

  async claim(deliveryId, riderId) {
    const rows = await update(this.table, {
      rider_id: riderId,
      claimed_at: new Date().toISOString(),
    }, { id: deliveryId, rider_id: null }); // optimistic lock: only claim if unassigned
    return Array.isArray(rows) ? rows[0] : rows;
  }

  async updateStatus(deliveryId, newStatus) {
    if (!VALID_STATUSES.includes(newStatus)) {
      throw new Error(`Invalid delivery status: ${newStatus}`);
    }
    const rows = await update(this.table, {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }, { id: deliveryId });
    return Array.isArray(rows) ? rows[0] : rows;
  }

  async logLocation(deliveryId, riderId, { lat, lon, heading, speed }) {
    return insert('rider_locations', {
      id: uuidv4(),
      delivery_id: deliveryId,
      rider_id: riderId,
      lat,
      lon,
      heading: heading || null,
      speed: speed || null,
      recorded_at: new Date().toISOString(),
    });
  }
}

module.exports = new DeliveryModel();
