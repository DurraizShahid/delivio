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
jest.mock('../services/stripe.service', () => ({
  createRefund: jest.fn().mockResolvedValue({ id: 're_test', status: 'succeeded' }),
  createPaymentIntent: jest.fn().mockResolvedValue({ clientSecret: 'pi_test_secret', paymentIntentId: 'pi_test' }),
}));
jest.mock('../services/notification.service', () => ({
  notifyNewOrder: jest.fn().mockResolvedValue(undefined),
  notifyOrderStatusChange: jest.fn().mockResolvedValue(undefined),
  sendRefundEmail: jest.fn().mockResolvedValue(undefined),
  sendCancellationEmail: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../lib/audit', () => ({ writeAuditLog: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../websocket/ws-server', () => ({
  init: jest.fn(), broadcast: jest.fn(), sendToUser: jest.fn(), isUserOnline: jest.fn().mockReturnValue(false),
}));

const request = require('supertest');
const app = require('../app');
const db = require('../lib/supabase');
const sessionService = require('../services/session.service');
const ws = require('../websocket/ws-server');
const stripeService = require('../services/stripe.service');
const { makeOrder, makeOrderItem, makeCustomer, IDS } = require('./helpers/mocks');

const ADMIN_COOKIE = 'admin_session=test-admin-sid';
const PROJECT_HEADER = { 'x-project-ref': 'test-project-ref' };
const ADMIN_SESSION = { id: IDS.USER, email: 'admin@test.com', role: 'admin', projectRef: 'test-project-ref', type: 'admin' };

beforeEach(() => {
  sessionService.getAdminSession.mockResolvedValue(null);
  sessionService.getCustomerSession.mockResolvedValue(null);
  db.select.mockResolvedValue([]);
  db.update.mockResolvedValue({});
});

// ─── GET /api/orders ──────────────────────────────────────────────────────────

describe('GET /api/orders', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/orders').set(PROJECT_HEADER);
    expect(res.status).toBe(401);
  });

  it('returns orders for authenticated admin', async () => {
    sessionService.getAdminSession.mockResolvedValue(ADMIN_SESSION);
    db.select.mockResolvedValue([makeOrder(), makeOrder({ id: 'order-002' })]);
    const res = await request(app).get('/api/orders').set('Cookie', ADMIN_COOKIE);
    expect(res.status).toBe(200);
    expect(res.body.orders).toHaveLength(2);
  });

  it('filters by status', async () => {
    sessionService.getAdminSession.mockResolvedValue(ADMIN_SESSION);
    db.select.mockResolvedValue([makeOrder({ status: 'completed' })]);
    const res = await request(app).get('/api/orders?status=completed').set('Cookie', ADMIN_COOKIE);
    expect(res.status).toBe(200);
    expect(res.body.orders[0].status).toBe('completed');
  });
});

// ─── GET /api/orders/:id ──────────────────────────────────────────────────────

describe('GET /api/orders/:id', () => {
  it('returns 404 when order not found', async () => {
    sessionService.getAdminSession.mockResolvedValue(ADMIN_SESSION);
    db.select.mockResolvedValue([]);
    const res = await request(app).get(`/api/orders/${IDS.ORDER}`).set('Cookie', ADMIN_COOKIE);
    expect(res.status).toBe(404);
  });

  it('returns 403 for different project — multi-tenant isolation', async () => {
    sessionService.getAdminSession.mockResolvedValue(ADMIN_SESSION);
    db.select.mockResolvedValue([makeOrder({ project_ref: 'OTHER-PROJECT' })]);
    const res = await request(app).get(`/api/orders/${IDS.ORDER}`).set('Cookie', ADMIN_COOKIE);
    expect(res.status).toBe(403);
  });

  it('returns order with items', async () => {
    sessionService.getAdminSession.mockResolvedValue(ADMIN_SESSION);
    db.select.mockResolvedValue([makeOrder({ order_items: [makeOrderItem()] })]);
    const res = await request(app).get(`/api/orders/${IDS.ORDER}`).set('Cookie', ADMIN_COOKIE);
    expect(res.status).toBe(200);
    expect(res.body.order.id).toBe(IDS.ORDER);
  });
});

// ─── PATCH /api/orders/:id/status ────────────────────────────────────────────

describe('PATCH /api/orders/:id/status', () => {
  it('returns 400 for invalid status', async () => {
    sessionService.getAdminSession.mockResolvedValue(ADMIN_SESSION);
    const res = await request(app).patch(`/api/orders/${IDS.ORDER}/status`)
      .set('Cookie', ADMIN_COOKIE).send({ status: 'invalid_status' });
    expect(res.status).toBe(400);
  });

  it('returns 404 when order not found', async () => {
    sessionService.getAdminSession.mockResolvedValue(ADMIN_SESSION);
    db.select.mockResolvedValue([]);
    const res = await request(app).patch(`/api/orders/${IDS.ORDER}/status`)
      .set('Cookie', ADMIN_COOKIE).send({ status: 'accepted' });
    expect(res.status).toBe(404);
  });

  it('updates status and broadcasts WS event', async () => {
    sessionService.getAdminSession.mockResolvedValue(ADMIN_SESSION);
    const order = makeOrder({ status: 'placed' });
    db.select.mockResolvedValue([order]);
    db.update.mockResolvedValue({ ...order, status: 'accepted', updated_at: new Date().toISOString() });
    const res = await request(app).patch(`/api/orders/${IDS.ORDER}/status`)
      .set('Cookie', ADMIN_COOKIE).send({ status: 'accepted' });
    expect(res.status).toBe(200);
    expect(ws.broadcast).toHaveBeenCalledWith('test-project-ref',
      expect.objectContaining({ type: 'order:status_changed', status: 'accepted' }));
  });
});

// ─── POST /api/orders/:id/refund ──────────────────────────────────────────────

describe('POST /api/orders/:id/refund', () => {
  it('returns 400 when order not paid', async () => {
    sessionService.getAdminSession.mockResolvedValue(ADMIN_SESSION);
    db.select.mockResolvedValue([makeOrder({ payment_status: 'unpaid' })]);
    const res = await request(app).post(`/api/orders/${IDS.ORDER}/refund`)
      .set('Cookie', ADMIN_COOKIE).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not been paid/i);
  });

  it('processes refund for paid order', async () => {
    sessionService.getAdminSession.mockResolvedValue(ADMIN_SESSION);
    db.select
      .mockResolvedValueOnce([makeOrder({ payment_status: 'paid', payment_intent_id: 'pi_test', total_cents: 2500 })])
      .mockResolvedValueOnce([makeCustomer()]);
    const res = await request(app).post(`/api/orders/${IDS.ORDER}/refund`)
      .set('Cookie', ADMIN_COOKIE).send({ reason: 'Customer request' });
    expect(res.status).toBe(200);
    expect(stripeService.createRefund).toHaveBeenCalled();
  });
});

// ─── POST /api/orders/:id/cancel ─────────────────────────────────────────────

describe('POST /api/orders/:id/cancel', () => {
  it('returns 400 for non-cancellable status', async () => {
    sessionService.getAdminSession.mockResolvedValue(ADMIN_SESSION);
    db.select.mockResolvedValue([makeOrder({ status: 'completed' })]);
    const res = await request(app).post(`/api/orders/${IDS.ORDER}/cancel`)
      .set('Cookie', ADMIN_COOKIE).send({ reason: 'test' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cannot cancel/i);
  });

  it('cancels a pending order', async () => {
    sessionService.getAdminSession.mockResolvedValue(ADMIN_SESSION);
    db.select
      .mockResolvedValueOnce([makeOrder({ status: 'placed', payment_status: 'unpaid' })])
      .mockResolvedValueOnce([makeCustomer()]);
    const res = await request(app).post(`/api/orders/${IDS.ORDER}/cancel`)
      .set('Cookie', ADMIN_COOKIE).send({ reason: 'Out of stock', initiator: 'vendor' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
