'use strict';

jest.mock('../lib/supabase', () => ({
  select: jest.fn().mockResolvedValue([]),
  insert: jest.fn().mockResolvedValue({}),
  update: jest.fn().mockResolvedValue({}),
  remove: jest.fn().mockResolvedValue(null),
  supabaseFetch: jest.fn().mockResolvedValue(null),
}));

jest.mock('../services/session.service', () => ({
  getAdminSession: jest.fn().mockResolvedValue(null),
  getCustomerSession: jest.fn().mockResolvedValue(null),
  createAdminSession: jest.fn().mockResolvedValue('new-admin-sid'),
  createCustomerSession: jest.fn().mockResolvedValue('new-customer-sid'),
  deleteAdminSession: jest.fn().mockResolvedValue(undefined),
  deleteCustomerSession: jest.fn().mockResolvedValue(undefined),
  setOTP: jest.fn().mockResolvedValue(undefined),
  getOTP: jest.fn().mockResolvedValue(null),
  incrementOTPAttempts: jest.fn().mockResolvedValue({ code: '123456', attempts: 1 }),
  deleteOTP: jest.fn().mockResolvedValue(undefined),
  checkOTPRateLimit: jest.fn().mockResolvedValue(true),
  setResetToken: jest.fn().mockResolvedValue(undefined),
  getResetToken: jest.fn().mockResolvedValue(null),
  deleteResetToken: jest.fn().mockResolvedValue(undefined),
  getStore: jest.fn().mockReturnValue({ get: jest.fn(), set: jest.fn(), delete: jest.fn() }),
}));

jest.mock('../services/sms.service', () => ({
  sendSMS: jest.fn().mockResolvedValue({ sid: 'SM-test' }),
  generateOTP: jest.fn().mockReturnValue('123456'),
}));

jest.mock('../services/email.service', () => ({
  sendEmail: jest.fn().mockResolvedValue({ id: 'email-test' }),
  passwordResetEmail: jest.fn().mockReturnValue({ subject: 'Reset', html: '<p>', text: 'Reset' }),
}));

jest.mock('../lib/audit', () => ({ writeAuditLog: jest.fn().mockResolvedValue(undefined) }));

jest.mock('../websocket/ws-server', () => ({
  init: jest.fn(),
  broadcast: jest.fn(),
  sendToUser: jest.fn(),
  isUserOnline: jest.fn().mockReturnValue(false),
}));

const request = require('supertest');
const app = require('../app');
const db = require('../lib/supabase');
const sessionService = require('../services/session.service');
const { makeUser, makeCustomer } = require('./helpers/mocks');

const ADMIN_COOKIE = 'admin_session=test-admin-sid';

beforeEach(() => {
  db.select.mockResolvedValue([]);
  db.insert.mockResolvedValue({});
  db.update.mockResolvedValue({});
  sessionService.getAdminSession.mockResolvedValue(null);
  sessionService.getCustomerSession.mockResolvedValue(null);
  sessionService.checkOTPRateLimit.mockResolvedValue(true);
});

// ─── GET /api/health ──────────────────────────────────────────────────────────

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  it('returns 400 when body is missing', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 400 for invalid email format', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'bad', password: 'pw' });
    expect(res.status).toBe(400);
  });

  it('returns 401 when user not found', async () => {
    db.select.mockResolvedValue([]);
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'Password123!' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it('returns 401 for wrong password', async () => {
    db.select.mockResolvedValue([makeUser()]);
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/auth/signup ────────────────────────────────────────────────────

describe('POST /api/auth/signup', () => {
  it('returns 400 for missing fields', async () => {
    const res = await request(app).post('/api/auth/signup').send({ email: 'x@x.com' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid role', async () => {
    const res = await request(app).post('/api/auth/signup')
      .send({ email: 'new@t.com', password: 'Password123!', role: 'superuser', projectRef: 'ref' });
    expect(res.status).toBe(400);
  });

  it('returns 409 when email already in use', async () => {
    db.select.mockResolvedValue([makeUser()]);
    const res = await request(app).post('/api/auth/signup')
      .send({ email: 'admin@test.com', password: 'Password123!', role: 'admin', projectRef: 'ref' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already registered/i);
  });
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  it('returns 200 and calls deleteAdminSession', async () => {
    sessionService.getAdminSession.mockResolvedValue({ id: 'uid', role: 'admin', projectRef: 'ref', type: 'admin' });
    const res = await request(app).post('/api/auth/logout').set('Cookie', ADMIN_COOKIE);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(sessionService.deleteAdminSession).toHaveBeenCalled();
  });
});

// ─── GET /api/auth/session ────────────────────────────────────────────────────

describe('GET /api/auth/session', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/auth/session');
    expect(res.status).toBe(401);
  });

  it('returns sanitised user when authenticated', async () => {
    const user = makeUser();
    sessionService.getAdminSession.mockResolvedValue({ id: user.id, role: user.role, projectRef: user.project_ref, type: 'admin' });
    db.select.mockResolvedValue([user]);
    const res = await request(app).get('/api/auth/session').set('Cookie', ADMIN_COOKIE);
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.password_hash).toBeUndefined();
  });
});

// ─── POST /api/auth/otp/send ──────────────────────────────────────────────────

describe('POST /api/auth/otp/send', () => {
  it('returns 200 for valid E.164 phone', async () => {
    const res = await request(app).post('/api/auth/otp/send').send({ phone: '+447700900000', projectRef: 'ref' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns 400 for non-E.164 phone', async () => {
    const res = await request(app).post('/api/auth/otp/send').send({ phone: '07700900000', projectRef: 'ref' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing projectRef', async () => {
    const res = await request(app).post('/api/auth/otp/send').send({ phone: '+447700900000' });
    expect(res.status).toBe(400);
  });

  it('returns 429 when rate limited', async () => {
    sessionService.checkOTPRateLimit.mockResolvedValue(false);
    const res = await request(app).post('/api/auth/otp/send').send({ phone: '+447700900000', projectRef: 'ref' });
    expect(res.status).toBe(429);
  });
});

// ─── POST /api/auth/otp/verify ────────────────────────────────────────────────

describe('POST /api/auth/otp/verify', () => {
  it('returns 400 when OTP not found/expired', async () => {
    sessionService.getOTP.mockResolvedValue(null);
    const res = await request(app).post('/api/auth/otp/verify')
      .send({ phone: '+447700900000', code: '123456', projectRef: 'ref' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/expired/i);
  });

  it('returns 400 for wrong code', async () => {
    sessionService.getOTP.mockResolvedValue({ code: '999999', attempts: 0 });
    const res = await request(app).post('/api/auth/otp/verify')
      .send({ phone: '+447700900000', code: '123456', projectRef: 'ref' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/incorrect/i);
  });

  it('creates customer session on correct code', async () => {
    const customer = makeCustomer();
    sessionService.getOTP.mockResolvedValue({ code: '123456', attempts: 0 });
    db.select.mockResolvedValue([]);
    db.insert.mockResolvedValue(customer);
    const res = await request(app).post('/api/auth/otp/verify')
      .send({ phone: '+447700900000', code: '123456', projectRef: 'ref' });
    expect(res.status).toBe(201);
    expect(res.body.customer).toBeDefined();
    expect(sessionService.createCustomerSession).toHaveBeenCalled();
  });
});

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────

describe('POST /api/auth/forgot-password', () => {
  it('always returns 200 to prevent enumeration', async () => {
    db.select.mockResolvedValue([]);
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'nobody@test.com' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns 400 for invalid email', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'bad' });
    expect(res.status).toBe(400);
  });
});
