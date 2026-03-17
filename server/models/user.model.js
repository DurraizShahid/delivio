'use strict';

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const BaseModel = require('./base.model');
const { update, select } = require('../lib/supabase');

const SALT_ROUNDS = 12;

class UserModel extends BaseModel {
  constructor() {
    super('app_users');
  }

  async findByEmail(email) {
    return this.findOne({ email });
  }

  async findByProjectRef(projectRef, role) {
    const filters = { project_ref: projectRef };
    if (role) filters.role = role;
    return this.findMany(filters);
  }

  async create({ email, password, role, projectRef }) {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    return super.create({
      id: uuidv4(),
      email,
      password_hash: passwordHash,
      role,
      project_ref: projectRef,
      totp_enabled: false,
      created_at: new Date().toISOString(),
    });
  }

  async verifyPassword(user, password) {
    return bcrypt.compare(password, user.password_hash);
  }

  async updatePassword(userId, newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    return update(this.table, { password_hash: passwordHash }, { id: userId });
  }

  async enableTOTP(userId, totpSecret) {
    return update(this.table, { totp_secret: totpSecret, totp_enabled: true }, { id: userId });
  }

  async disableTOTP(userId) {
    return update(this.table, { totp_secret: null, totp_enabled: false }, { id: userId });
  }

  // Return user without sensitive fields
  sanitise(user) {
    if (!user) return null;
    const { password_hash, totp_secret, ...safe } = user;
    return safe;
  }
}

module.exports = new UserModel();
