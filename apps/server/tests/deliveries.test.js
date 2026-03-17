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
  checkLocationRateLimit: jest.fn().mockResolvedValue(true),
  cacheRiderLocation: jest.fn().mockResolvedValue(undefined),
  getRiderLocation: jest.fn().mockResolvedValue(null),
}));
jest.mock('../services/notification.service', () => ({
  notifyDeliveryAssigned: jest.fn().mockResolvedValue(undefined),
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
const { makeDelivery, IDS } = require('./helpers/mocks');

const ADMIN_COOKIE = 'admin_session=test-admin-sid';
const PROJECT_HEADER = { 'x-project-ref': 'test-project-ref' };
const RIDER_SESSION = { id: IDS.USER, email: 'rider@test.com', role: 'rider', projectRef: 'test-project-ref', type: 'admin' };

beforeEach(() => {
  sessionService.getAdminSession.mockResolvedValue(null);
  sessionService.checkLocationRateLimit.mockResolvedValue(true);
  db.select.mockResolvedValue([]);
  db.update.mockResolvedValue({});
});

// ─── GET /api/deliveries/rider/deliveries ─────────────────────────────────────

describe('GET /api/deliveries/rider/deliveries', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/deliveries/rider/deliveries').set(PROJECT_HEADER);
    expect(res.status).toBe(401);
  });

  it('returns rider deliveries', async () => {
    sessionService.getAdminSession.mockResolvedValue(RIDER_SESSION);
    db.select.mockResolvedValue([makeDelivery({ rider_id: 'rider-uuid-001' })]);
    const res = await request(app).get('/api/deliveries/rider/deliveries').set('Cookie', ADMIN_COOKIE);
    expect(res.status).toBe(200);
    expect(res.body.deliveries).toHaveLength(1);
  });
});

// ─── POST /api/deliveries/:id/claim ──────────────────────────────────────────

describe('POST /api/deliveries/:id/claim', () => {
  it('returns 404 when delivery not found', async () => {
    sessionService.getAdminSession.mockResolvedValue(RIDER_SESSION);
    db.select.mockResolvedValue([]);
    const res = await request(app).post('/api/deliveries/delivery-001/claim').set('Cookie', ADMIN_COOKIE);
    expect(res.status).toBe(404);
  });

  it('returns 409 when already claimed by another rider', async () => {
    sessionService.getAdminSession.mockResolvedValue(RIDER_SESSION);
    db.select.mockResolvedValue([makeDelivery({ rider_id: 'other-rider' })]);
    const res = await request(app).post('/api/deliveries/delivery-001/claim').set('Cookie', ADMIN_COOKIE);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already claimed/i);
  });

  it('claims an unclaimed delivery', async () => {
    sessionService.getAdminSession.mockResolvedValue(RIDER_SESSION);
    db.select.mockResolvedValue([makeDelivery()]);
    db.update.mockResolvedValue(makeDelivery({ rider_id: 'rider-uuid-001' }));
    const res = await request(app).post('/api/deliveries/delivery-001/claim').set('Cookie', ADMIN_COOKIE);
    expect(res.status).toBe(200);
    expect(res.body.delivery).toBeDefined();
  });
});

// ─── POST /api/deliveries/:id/location ───────────────────────────────────────

describe('POST /api/deliveries/:id/location', () => {
  it('returns 400 for missing lon', async () => {
    sessionService.getAdminSession.mockResolvedValue(RIDER_SESSION);
    const res = await request(app).post('/api/deliveries/delivery-001/location')
      .set('Cookie', ADMIN_COOKIE).send({ lat: 51.5 });
    expect(res.status).toBe(400);
  });

  it('returns 400 for out-of-range latitude', async () => {
    sessionService.getAdminSession.mockResolvedValue(RIDER_SESSION);
    const res = await request(app).post('/api/deliveries/delivery-001/location')
      .set('Cookie', ADMIN_COOKIE).send({ lat: 999, lon: 0 });
    expect(res.status).toBe(400);
  });

  it('caches location and broadcasts WS event', async () => {
    sessionService.getAdminSession.mockResolvedValue(RIDER_SESSION);
    const res = await request(app).post('/api/deliveries/delivery-001/location')
      .set('Cookie', ADMIN_COOKIE).send({ lat: 51.5074, lon: -0.1278, heading: 90, speed: 15.5 });
    expect(res.status).toBe(200);
    expect(sessionService.cacheRiderLocation).toHaveBeenCalledWith('delivery-001',
      expect.objectContaining({ lat: 51.5074, lon: -0.1278 }));
    expect(ws.broadcast).toHaveBeenCalledWith('test-project-ref',
      expect.objectContaining({ type: 'delivery:location_update', deliveryId: 'delivery-001' }));
  });

  it('returns 429 when too frequent', async () => {
    sessionService.getAdminSession.mockResolvedValue(RIDER_SESSION);
    sessionService.checkLocationRateLimit.mockResolvedValue(false);
    const res = await request(app).post('/api/deliveries/delivery-001/location')
      .set('Cookie', ADMIN_COOKIE).send({ lat: 51.5074, lon: -0.1278 });
    expect(res.status).toBe(429);
  });
});

// ─── GET /api/deliveries/:id/location ────────────────────────────────────────

describe('GET /api/deliveries/:id/location', () => {
  it('returns 404 when not in cache', async () => {
    sessionService.getAdminSession.mockResolvedValue(RIDER_SESSION);
    sessionService.getRiderLocation.mockResolvedValue(null);
    const res = await request(app).get('/api/deliveries/delivery-001/location').set('Cookie', ADMIN_COOKIE);
    expect(res.status).toBe(404);
  });

  it('returns cached location', async () => {
    sessionService.getAdminSession.mockResolvedValue(RIDER_SESSION);
    sessionService.getRiderLocation.mockResolvedValue({ lat: 51.5, lon: -0.12, updatedAt: new Date().toISOString() });
    const res = await request(app).get('/api/deliveries/delivery-001/location').set('Cookie', ADMIN_COOKIE);
    expect(res.status).toBe(200);
    expect(res.body.location.lat).toBe(51.5);
  });
});
