'use strict';

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const BaseModel = require('./base.model');

const SALT_ROUNDS = 12;

class SuperadminModel extends BaseModel {
  constructor() {
    super('superadmins');
  }

  async findByEmail(email) {
    return this.findOne({ email });
  }

  async create({ email, password, name }) {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    return super.create({
      id: uuidv4(),
      email,
      password_hash: passwordHash,
      name: name || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  async verifyPassword(user, password) {
    return bcrypt.compare(password, user.password_hash);
  }

  sanitise(user) {
    if (!user) return null;
    const { password_hash, ...safe } = user;
    return safe;
  }
}

module.exports = new SuperadminModel();
