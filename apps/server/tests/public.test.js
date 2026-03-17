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
}));
jest.mock('../websocket/ws-server', () => ({
  init: jest.fn(), broadcast: jest.fn(), sendToUser: jest.fn(), isUserOnline: jest.fn().mockReturnValue(false),
}));

const request = require('supertest');
const app = require('../app');
const db = require('../lib/supabase');

beforeEach(() => {
  db.select.mockResolvedValue([]);
});

// ─── GET /api/health ──────────────────────────────────────────────────────────

describe('GET /api/health', () => {
  it('returns 200 with required fields', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(res.body.env).toBe('test');
  });

  it('is accessible without authentication', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).not.toBe(401);
  });
});

// ─── GET /api/public/:ref/:table ──────────────────────────────────────────────

describe('GET /api/public/:ref/:table', () => {
  it('returns 403 for app_users (non-public table)', async () => {
    const res = await request(app).get('/api/public/test-ref/app_users');
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/not publicly accessible/i);
  });

  it('returns 403 for push_tokens (non-public table)', async () => {
    const res = await request(app).get('/api/public/test-ref/push_tokens');
    expect(res.status).toBe(403);
  });

  it('returns products for a valid ref', async () => {
    db.select.mockResolvedValue([{ id: 'prod-001', name: 'Burger', price_cents: 1200 }]);
    const res = await request(app).get('/api/public/test-ref/products');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Burger');
  });

  it('returns 400 for orders without orderId — prevents mass exposure', async () => {
    const res = await request(app).get('/api/public/test-ref/orders');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/orderId filter/i);
  });

  it('returns order data when orderId provided', async () => {
    db.select.mockResolvedValue([{ id: 'order-001', status: 'pending' }]);
    const res = await request(app).get('/api/public/test-ref/orders?orderId=order-001');
    expect(res.status).toBe(200);
    expect(res.body.data[0].id).toBe('order-001');
  });
});

// ─── 404 handler ─────────────────────────────────────────────────────────────

describe('404 handler', () => {
  it('returns 404 for unknown GET route', async () => {
    const res = await request(app).get('/api/nonexistent-route-xyz');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 404 for unknown POST route', async () => {
    const res = await request(app).post('/api/unknown');
    expect(res.status).toBe(404);
  });
});

// ─── Security headers (Helmet) ────────────────────────────────────────────────

describe('Security headers', () => {
  it('sets X-Content-Type-Options: nosniff', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('sets X-Frame-Options header', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-frame-options']).toBeDefined();
  });
});
