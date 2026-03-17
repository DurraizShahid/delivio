'use strict';

const { v4: uuidv4 } = require('uuid');
const BaseModel = require('./base.model');
const { select, insert, update, remove } = require('../lib/supabase');

class CartModel extends BaseModel {
  constructor() {
    super('cart_sessions');
  }

  async getOrCreate(sessionId, projectRef) {
    let session = await this.findOne({ id: sessionId, project_ref: projectRef });
    if (!session) {
      const rows = await insert(this.table, {
        id: sessionId || uuidv4(),
        project_ref: projectRef,
        customer_id: null,
        created_at: new Date().toISOString(),
      });
      session = Array.isArray(rows) ? rows[0] : rows;
    }
    return session;
  }

  async getWithItems(sessionId) {
    const session = await this.findOne({ id: sessionId });
    if (!session) return null;

    const items = await select('cart_items', {
      filters: { session_id: sessionId },
      order: 'created_at.asc',
    });

    const totalCents = (items || []).reduce(
      (sum, i) => sum + i.unit_price_cents * i.quantity, 0
    );

    return { ...session, items: items || [], totalCents };
  }

  async addItem(sessionId, { productId, name, quantity, unitPriceCents }) {
    // Upsert: if same product already in cart, increment quantity
    const existing = await select('cart_items', {
      filters: { session_id: sessionId, product_id: productId },
    });

    if (existing && existing.length > 0) {
      const item = existing[0];
      const rows = await update('cart_items', {
        quantity: item.quantity + quantity,
      }, { id: item.id });
      return Array.isArray(rows) ? rows[0] : rows;
    }

    const rows = await insert('cart_items', {
      id: uuidv4(),
      session_id: sessionId,
      product_id: productId || null,
      name,
      quantity,
      unit_price_cents: unitPriceCents,
      created_at: new Date().toISOString(),
    });
    return Array.isArray(rows) ? rows[0] : rows;
  }

  async updateItem(itemId, { quantity }) {
    if (quantity <= 0) {
      return remove('cart_items', { id: itemId });
    }
    const rows = await update('cart_items', { quantity }, { id: itemId });
    return Array.isArray(rows) ? rows[0] : rows;
  }

  async removeItem(itemId) {
    return remove('cart_items', { id: itemId });
  }

  async clearItems(sessionId) {
    return remove('cart_items', { session_id: sessionId });
  }

  async linkToCustomer(sessionId, customerId) {
    return update(this.table, { customer_id: customerId }, { id: sessionId });
  }

  /**
   * Merge guest cart items into a customer's existing cart.
   * Used on login when guest has items in their cart.
   */
  async mergeIntoSession(sourceSessionId, targetSessionId) {
    const sourceItems = await select('cart_items', { filters: { session_id: sourceSessionId } });
    if (!sourceItems || sourceItems.length === 0) return;

    for (const item of sourceItems) {
      await this.addItem(targetSessionId, {
        productId: item.product_id,
        name: item.name,
        quantity: item.quantity,
        unitPriceCents: item.unit_price_cents,
      });
    }

    await this.clearItems(sourceSessionId);
  }

  async cleanOldSessions(daysOld = 30) {
    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();
    const old = await select(this.table, {
      select: 'id',
      filters: {},
    });
    // Delete via Supabase filter
    const { supabaseFetch } = require('../lib/supabase');
    return supabaseFetch(
      `/rest/v1/${this.table}?created_at=lt.${encodeURIComponent(cutoff)}`,
      { method: 'DELETE' }
    );
  }
}

module.exports = new CartModel();
