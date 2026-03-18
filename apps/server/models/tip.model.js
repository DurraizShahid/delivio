'use strict';

const { v4: uuidv4 } = require('uuid');
const BaseModel = require('./base.model');
const { select, supabaseFetch } = require('../lib/supabase');

class TipModel extends BaseModel {
  constructor() {
    super('tips');
  }

  async create({ orderId, fromCustomerId, toRiderId, amountCents }) {
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      throw new Error('Tip amount must be a positive integer (cents)');
    }

    return super.create({
      id: uuidv4(),
      order_id: orderId,
      from_customer_id: fromCustomerId,
      to_rider_id: toRiderId,
      amount_cents: amountCents,
      created_at: new Date().toISOString(),
    });
  }

  async findByOrder(orderId) {
    return select(this.table, {
      filters: { order_id: orderId },
      order: 'created_at.desc',
    });
  }

  async totalForRider(riderId) {
    const rows = await supabaseFetch(
      `/rest/v1/${this.table}?to_rider_id=eq.${encodeURIComponent(riderId)}&select=amount_cents`
    );
    if (!rows || rows.length === 0) return 0;
    return rows.reduce((acc, r) => acc + r.amount_cents, 0);
  }
}

module.exports = new TipModel();
