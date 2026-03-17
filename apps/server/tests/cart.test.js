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
jest.mock('../lib/audit', () => ({ writeAuditLog: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../websocket/ws-server', () => ({
  init: jest.fn(), broadcast: jest.fn(), sendToUser: jest.fn(), isUserOnline: jest.fn().mockReturnValue(false),
}));

const request = require('supertest');
const app = require('../app');
const db = require('../lib/supabase');
const { makeCartSession, makeCartItem } = require('./helpers/mocks');

const PROJECT = { 'x-project-ref': 'test-project-ref' };
const CART = 'cart_session=test-cart-sid';

beforeEach(() => {
  db.select.mockResolvedValue([]);
  db.insert.mockResolvedValue({});
  db.update.mockResolvedValue({});
  db.remove.mockResolvedValue(null);
});

// ─── GET /api/cart ────────────────────────────────────────────────────────────

describe('GET /api/cart', () => {
  it('returns empty cart', async () => {
    db.select.mockResolvedValue([]);
    const res = await request(app).get('/api/cart').set(PROJECT).set('Cookie', CART);
    expect(res.status).toBe(200);
    expect(res.body.cart.items).toEqual([]);
    expect(res.body.cart.totalCents).toBe(0);
  });

  it('calculates totalCents from items', async () => {
    db.select
      .mockResolvedValueOnce([makeCartSession()])
      .mockResolvedValueOnce([
        makeCartItem({ quantity: 2, unit_price_cents: 1000 }),
        makeCartItem({ id: 'item-2', quantity: 1, unit_price_cents: 500 }),
      ]);
    const res = await request(app).get('/api/cart').set(PROJECT).set('Cookie', CART);
    expect(res.status).toBe(200);
    expect(res.body.cart.totalCents).toBe(2500);
    expect(res.body.cart.items).toHaveLength(2);
  });
});

// ─── POST /api/cart ───────────────────────────────────────────────────────────

describe('POST /api/cart', () => {
  it('returns 400 for missing fields', async () => {
    const res = await request(app).post('/api/cart').set(PROJECT).send({ quantity: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 400 for zero quantity', async () => {
    const res = await request(app).post('/api/cart').set(PROJECT)
      .send({ name: 'Burger', quantity: 0, unitPriceCents: 1000 });
    expect(res.status).toBe(400);
  });

  it('adds item to cart', async () => {
    const item = makeCartItem();
    db.select.mockResolvedValueOnce([makeCartSession()]).mockResolvedValueOnce([]);
    db.insert.mockResolvedValue(item);
    const res = await request(app).post('/api/cart').set(PROJECT).set('Cookie', CART)
      .send({ name: 'Burger', quantity: 1, unitPriceCents: 1200 });
    expect(res.status).toBe(201);
    expect(res.body.item.name).toBe('Burger');
  });
});

// ─── PATCH /api/cart/:itemId ──────────────────────────────────────────────────

describe('PATCH /api/cart/:itemId', () => {
  it('returns 400 for negative quantity', async () => {
    const res = await request(app).patch('/api/cart/item-001').set(PROJECT).send({ quantity: -1 });
    expect(res.status).toBe(400);
  });

  it('updates item quantity', async () => {
    db.update.mockResolvedValue(makeCartItem({ quantity: 3 }));
    const res = await request(app).patch('/api/cart/item-001').set(PROJECT).send({ quantity: 3 });
    expect(res.status).toBe(200);
  });

  it('removes item when quantity is 0', async () => {
    const res = await request(app).patch('/api/cart/item-001').set(PROJECT).send({ quantity: 0 });
    expect(res.status).toBe(200);
    expect(db.remove).toHaveBeenCalledWith('cart_items', { id: 'item-001' });
  });
});

// ─── DELETE /api/cart/:itemId ─────────────────────────────────────────────────

describe('DELETE /api/cart/:itemId', () => {
  it('removes item and returns ok', async () => {
    const res = await request(app).delete('/api/cart/item-001').set(PROJECT);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
