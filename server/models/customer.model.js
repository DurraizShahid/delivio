'use strict';

const { v4: uuidv4 } = require('uuid');
const BaseModel = require('./base.model');
const { select } = require('../lib/supabase');

class CustomerModel extends BaseModel {
  constructor() {
    super('customers');
  }

  async findByPhone(phone) {
    return this.findOne({ phone });
  }

  async findOrCreate({ phone, projectRef }) {
    const existing = await this.findOne({ phone, project_ref: projectRef });
    if (existing) return { customer: existing, created: false };

    const customer = await super.create({
      id: uuidv4(),
      phone,
      project_ref: projectRef,
      created_at: new Date().toISOString(),
    });
    return { customer, created: true };
  }

  async updateProfile(customerId, { name, email }) {
    return this.updateById(customerId, { name, email });
  }

  async getAddresses(customerId) {
    return select('customer_addresses', {
      filters: { customer_id: customerId },
      order: 'is_default.desc,created_at.asc',
    });
  }

  async addAddress(customerId, addressData) {
    const { insert } = require('../lib/supabase');
    if (addressData.is_default) {
      const { update } = require('../lib/supabase');
      await update('customer_addresses', { is_default: false }, { customer_id: customerId });
    }
    return insert('customer_addresses', {
      id: uuidv4(),
      customer_id: customerId,
      ...addressData,
      created_at: new Date().toISOString(),
    });
  }

  async deleteAddress(addressId, customerId) {
    const { remove } = require('../lib/supabase');
    return remove('customer_addresses', { id: addressId, customer_id: customerId });
  }
}

module.exports = new CustomerModel();
