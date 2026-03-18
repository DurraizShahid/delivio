'use strict';

jest.mock('../services/session.service', () => ({
  getAdminSession: jest.fn(),
  getCustomerSession: jest.fn(),
}));

jest.mock('../models/order.model', () => ({
  findByProjectRef: jest.fn(),
  findById: jest.fn(),
  findWithItems: jest.fn(),
  updateStatus: jest.fn(),
  setSlaDeadline: jest.fn(),
  validateTransition: jest.fn(),
  isCancellable: jest.fn(),
  cancel: jest.fn(),
}));

jest.mock('../models/delivery.model', () => ({
  findByOrderId: jest.fn(),
  updateStatus: jest.fn(),
}));

jest.mock('../models/vendor-settings.model', () => ({
  findByProjectRef: jest.fn(),
}));

jest.mock('../services/notification.service', () => ({
  notifyOrderStatusChange: jest.fn(),
}));

jest.mock('../websocket/ws-server', () => ({
  broadcast: jest.fn(),
  sendToUser: jest.fn(),
  isUserOnline: jest.fn().mockReturnValue(false),
  listOnlineUsersByRole: jest.fn().mockReturnValue([]),
}));

jest.mock('../lib/audit', () => ({ writeAuditLog: jest.fn().mockResolvedValue(undefined) }));

const { createTestApp, mockAdminSession, mockCustomerSession, clearSessions } = require('./helpers/app');
const sessionService = require('../services/session.service');
const orderModel = require('../models/order.model');
const vendorSettingsModel = require('../models/vendor-settings.model');

describe('AuthZ + idempotency hardening', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('customer listOrders forces customerId to self', async () => {
    mockCustomerSession(sessionService, { id: 'cust-1', projectRef: 'proj-1' });
    orderModel.findByProjectRef.mockResolvedValue([{ id: 'o1' }]);

    const { agent } = createTestApp();
    const res = await agent
      .get('/api/orders?customerId=a2000000-0000-0000-0000-000000000001')
      .set('Cookie', ['customer_session=test'])
      .expect(200);

    expect(res.body.orders).toHaveLength(1);
    expect(orderModel.findByProjectRef).toHaveBeenCalledWith(
      'proj-1',
      expect.objectContaining({ customerId: 'cust-1' })
    );
  });

  test('customer cannot accept an order (role guard)', async () => {
    mockCustomerSession(sessionService, { id: 'cust-1', projectRef: 'proj-1' });
    const { agent } = createTestApp();

    await agent
      .post('/api/orders/order-1/accept')
      .set('Cookie', ['customer_session=test'])
      .send({ prepTimeMinutes: 10 })
      .expect(401);
  });

  test('vendor can accept, and second accept is idempotent', async () => {
    mockAdminSession(sessionService, { id: 'vendor-1', role: 'vendor', projectRef: 'proj-1' });
    vendorSettingsModel.findByProjectRef.mockResolvedValue({ default_prep_time_minutes: 20 });

    orderModel.findById
      .mockResolvedValueOnce({ id: 'order-1', project_ref: 'proj-1', status: 'placed', customer_id: 'cust-1' })
      .mockResolvedValueOnce({ id: 'order-1', project_ref: 'proj-1', status: 'accepted', customer_id: 'cust-1' })
      .mockResolvedValueOnce({ id: 'order-1', project_ref: 'proj-1', status: 'accepted', customer_id: 'cust-1' });

    orderModel.updateStatus.mockResolvedValue({});

    const { agent } = createTestApp();

    await agent
      .post('/api/orders/order-1/accept')
      .set('Cookie', ['admin_session=test'])
      .send({ prepTimeMinutes: 10 })
      .expect(200);

    const res2 = await agent
      .post('/api/orders/order-1/accept')
      .set('Cookie', ['admin_session=test'])
      .send({ prepTimeMinutes: 10 })
      .expect(200);

    expect(res2.body.idempotent).toBe(true);
  });

  test('unauthenticated request is rejected', async () => {
    clearSessions(sessionService);
    const { agent } = createTestApp({ role: null });
    await agent.get('/api/orders').set('x-project-ref', 'proj-1').expect(401);
  });
});

