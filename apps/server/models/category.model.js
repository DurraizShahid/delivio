'use strict';

const { v4: uuidv4 } = require('uuid');
const BaseModel = require('./base.model');
const { select, insert, update, remove } = require('../lib/supabase');

class CategoryModel extends BaseModel {
  constructor() {
    super('categories');
  }

  async list(projectRef) {
    return select(this.table, {
      filters: { project_ref: projectRef },
      order: 'sort_order.asc,name.asc',
    });
  }

  async createCategory(projectRef, data) {
    const now = new Date().toISOString();
    const row = {
      id: uuidv4(),
      project_ref: projectRef,
      name: data.name,
      sort_order: data.sortOrder ?? 0,
      created_at: now,
      updated_at: now,
    };
    const res = await insert(this.table, [row]);
    return Array.isArray(res) ? res[0] : res;
  }

  async updateCategory(projectRef, id, data) {
    const patch = {
      ...(data.name != null ? { name: data.name } : {}),
      ...(data.sortOrder != null ? { sort_order: data.sortOrder } : {}),
      updated_at: new Date().toISOString(),
    };
    const res = await update(this.table, patch, { id, project_ref: projectRef });
    return Array.isArray(res) ? res[0] : res;
  }

  async deleteCategory(projectRef, id) {
    return remove(this.table, { id, project_ref: projectRef });
  }
}

module.exports = new CategoryModel();

