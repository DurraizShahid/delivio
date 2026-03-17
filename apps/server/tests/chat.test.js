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
jest.mock('../services/notification.service', () => ({
  notifyNewMessage: jest.fn().mockResolvedValue(undefined),
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
const { makeOrder, makeConversation, makeMessage, IDS } = require('./helpers/mocks');

const ADMIN_COOKIE = 'admin_session=test-admin-sid';
const ADMIN_SESSION = { id: IDS.USER, email: 'admin@test.com', role: 'admin', projectRef: 'test-project-ref', type: 'admin' };

beforeEach(() => {
  sessionService.getAdminSession.mockResolvedValue(null);
  sessionService.getCustomerSession.mockResolvedValue(null);
  db.select.mockResolvedValue([]);
  db.insert.mockResolvedValue({});
  db.update.mockResolvedValue({});
});

// ─── POST /api/chat/conversations ────────────────────────────────────────────

describe('POST /api/chat/conversations', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).post('/api/chat/conversations')
      .send({ orderId: 'order-uuid-001', type: 'customer_vendor' });
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid type', async () => {
    sessionService.getAdminSession.mockResolvedValue(ADMIN_SESSION);
    const res = await request(app).post('/api/chat/conversations').set('Cookie', ADMIN_COOKIE)
      .send({ orderId: 'order-uuid-001', type: 'invalid_type' });
    expect(res.status).toBe(400);
  });

  it('returns 404 when order not found', async () => {
    sessionService.getAdminSession.mockResolvedValue(ADMIN_SESSION);
    db.select.mockResolvedValue([]);
    const res = await request(app).post('/api/chat/conversations').set('Cookie', ADMIN_COOKIE)
      .send({ orderId: IDS.ORDER, type: 'customer_vendor' });
    expect(res.status).toBe(404);
  });

  it('returns 403 for different project — multi-tenant isolation', async () => {
    sessionService.getAdminSession.mockResolvedValue(ADMIN_SESSION);
    db.select.mockResolvedValue([makeOrder({ project_ref: 'ATTACKER-PROJECT' })]);
    const res = await request(app).post('/api/chat/conversations').set('Cookie', ADMIN_COOKIE)
      .send({ orderId: IDS.ORDER, type: 'customer_vendor' });
    expect(res.status).toBe(403);
  });

  it('creates a new conversation (201)', async () => {
    sessionService.getAdminSession.mockResolvedValue(ADMIN_SESSION);
    db.select.mockResolvedValueOnce([makeOrder()]).mockResolvedValueOnce([]);
    db.insert.mockResolvedValue(makeConversation());
    const res = await request(app).post('/api/chat/conversations').set('Cookie', ADMIN_COOKIE)
      .send({ orderId: IDS.ORDER, type: 'customer_vendor' });
    expect(res.status).toBe(201);
    expect(res.body.conversation).toBeDefined();
  });

  it('returns existing conversation as 200 — idempotent', async () => {
    sessionService.getAdminSession.mockResolvedValue(ADMIN_SESSION);
    const conv = makeConversation();
    db.select.mockResolvedValueOnce([makeOrder()]).mockResolvedValueOnce([conv]);
    const res = await request(app).post('/api/chat/conversations').set('Cookie', ADMIN_COOKIE)
      .send({ orderId: IDS.ORDER, type: 'customer_vendor' });
    expect(res.status).toBe(200);
    expect(res.body.conversation.id).toBe(conv.id);
  });
});

// ─── POST /api/chat/conversations/:id/messages ───────────────────────────────

describe('POST /api/chat/conversations/:id/messages', () => {
  it('returns 400 for empty content', async () => {
    sessionService.getAdminSession.mockResolvedValue(ADMIN_SESSION);
    const res = await request(app).post('/api/chat/conversations/conv-001/messages')
      .set('Cookie', ADMIN_COOKIE).send({ content: '' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for content over 2000 chars', async () => {
    sessionService.getAdminSession.mockResolvedValue(ADMIN_SESSION);
    const res = await request(app).post('/api/chat/conversations/conv-001/messages')
      .set('Cookie', ADMIN_COOKIE).send({ content: 'x'.repeat(2001) });
    expect(res.status).toBe(400);
  });

  it('returns 403 for different project — multi-tenant isolation', async () => {
    sessionService.getAdminSession.mockResolvedValue(ADMIN_SESSION);
    db.select.mockResolvedValue([makeConversation({ project_ref: 'ATTACKER-PROJECT' })]);
    const res = await request(app).post('/api/chat/conversations/conv-001/messages')
      .set('Cookie', ADMIN_COOKIE).send({ content: 'Hello' });
    expect(res.status).toBe(403);
  });

  it('sends message and broadcasts chat:message WS event', async () => {
    sessionService.getAdminSession.mockResolvedValue(ADMIN_SESSION);
    db.select.mockResolvedValue([makeConversation()]);
    db.insert.mockResolvedValue(makeMessage());
    const res = await request(app).post('/api/chat/conversations/conv-001/messages')
      .set('Cookie', ADMIN_COOKIE).send({ content: 'Ready!' });
    expect(res.status).toBe(201);
    expect(res.body.message).toBeDefined();
    expect(ws.broadcast).toHaveBeenCalledWith('test-project-ref',
      expect.objectContaining({ type: 'chat:message', conversationId: 'conv-001' }));
  });
});

// ─── GET /api/chat/conversations/:id/messages ────────────────────────────────

describe('GET /api/chat/conversations/:id/messages', () => {
  it('returns 403 for different project — multi-tenant isolation', async () => {
    sessionService.getAdminSession.mockResolvedValue(ADMIN_SESSION);
    db.select.mockResolvedValue([makeConversation({ project_ref: 'ATTACKER-PROJECT' })]);
    const res = await request(app).get('/api/chat/conversations/conv-001/messages').set('Cookie', ADMIN_COOKIE);
    expect(res.status).toBe(403);
  });

  it('returns paginated messages', async () => {
    sessionService.getAdminSession.mockResolvedValue(ADMIN_SESSION);
    db.select.mockResolvedValueOnce([makeConversation()]).mockResolvedValueOnce([makeMessage(), makeMessage({ id: 'msg-002' })]);
    const res = await request(app).get('/api/chat/conversations/conv-001/messages?page=1').set('Cookie', ADMIN_COOKIE);
    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(2);
    expect(res.body.page).toBe(1);
  });
});
