'use strict';

const { v4: uuidv4 } = require('uuid');
const BaseModel = require('./base.model');
const { select, insert, update, remove } = require('../lib/supabase');

class ProductModel extends BaseModel {
  constructor() {
    super('products');
  }

  async list(shopId, { includeUnavailable = true } = {}) {
    const filters = { shop_id: shopId };
    if (!includeUnavailable) filters.available = true;
    return select(this.table, {
      filters,
      order: 'sort_order.asc,created_at.desc',
    });
  }

  /** @deprecated Use list(shopId) instead */
  async listByProjectRef(projectRef, { includeUnavailable = true } = {}) {
    const filters = { project_ref: projectRef };
    if (!includeUnavailable) filters.available = true;
    return select(this.table, {
      filters,
      order: 'sort_order.asc,created_at.desc',
    });
  }

  async get(shopId, id) {
    const rows = await select(this.table, { filters: { id, shop_id: shopId } });
    return rows?.[0] || null;
  }

  async createProduct(shopId, projectRef, data) {
    const now = new Date().toISOString();
    const row = {
      id: uuidv4(),
      project_ref: projectRef,
      shop_id: shopId,
      name: data.name,
      description: data.description ?? null,
      price_cents: data.priceCents,
      category: data.category ?? null,
      image_url: data.imageUrl ?? null,
      available: data.available ?? true,
      sort_order: data.sortOrder ?? 0,
      created_at: now,
      updated_at: now,
    };
    const res = await insert(this.table, [row]);
    return Array.isArray(res) ? res[0] : res;
  }

  async updateProduct(shopId, id, data) {
    const patch = {
      ...(data.name != null ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description ?? null } : {}),
      ...(data.priceCents != null ? { price_cents: data.priceCents } : {}),
      ...(data.category !== undefined ? { category: data.category ?? null } : {}),
      ...(data.imageUrl !== undefined ? { image_url: data.imageUrl ?? null } : {}),
      ...(data.available != null ? { available: data.available } : {}),
      ...(data.sortOrder != null ? { sort_order: data.sortOrder } : {}),
      updated_at: new Date().toISOString(),
    };
    const res = await update(this.table, patch, { id, shop_id: shopId });
    return Array.isArray(res) ? res[0] : res;
  }

  async deleteProduct(shopId, id) {
    return remove(this.table, { id, shop_id: shopId });
  }
}

module.exports = new ProductModel();
