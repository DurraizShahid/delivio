'use strict';

/**
 * Test app helper.
 *
 * Provides createTestApp() — returns a supertest agent pre-wired with
 * an authenticated admin or customer session, bypassing real session lookup.
 *
 * Usage:
 *   const { agent } = createTestApp({ role: 'admin', projectRef: 'test-ref' });
 *   await agent.get('/api/orders').expect(200);
 */

const request = require('supertest');

/**
 * Build a supertest agent from the express app with session middleware bypassed.
 *
 * @param {object} [opts]
 * @param {'admin'|'vendor'|'rider'|'customer'|null} [opts.role] - Session role to inject
 * @param {string} [opts.projectRef]
 * @param {string} [opts.userId]
 */
function createTestApp(opts = {}) {
  const { role = 'admin', projectRef = 'test-project-ref', userId = 'user-uuid-001' } = opts;

  const app = require('../../app');
  const agent = request.agent(app);

  // Inject session via the parseSession middleware mock
  // The session service's getAdminSession / getCustomerSession
  // are mocked per-test — use mockAdminSession / mockCustomerSession helpers below.

  return { app, agent };
}

/**
 * Mock an admin session in the session service for the duration of a test.
 * Call inside beforeEach or the test body.
 */
function mockAdminSession(sessionService, userData = {}) {
  const defaults = {
    id: 'user-uuid-001',
    email: 'admin@test.com',
    role: 'admin',
    projectRef: 'test-project-ref',
    type: 'admin',
  };
  sessionService.getAdminSession.mockResolvedValue({ ...defaults, ...userData });
  return defaults.id;
}

/**
 * Mock a customer session in the session service.
 */
function mockCustomerSession(sessionService, customerData = {}) {
  const defaults = {
    id: 'customer-uuid-001',
    phone: '+447700900000',
    name: 'Test Customer',
    projectRef: 'test-project-ref',
    type: 'customer',
  };
  sessionService.getCustomerSession.mockResolvedValue({ ...defaults, ...customerData });
  return defaults.id;
}

/**
 * Clear all mocked sessions (unauthenticated state).
 */
function clearSessions(sessionService) {
  sessionService.getAdminSession.mockResolvedValue(null);
  sessionService.getCustomerSession.mockResolvedValue(null);
}

module.exports = { createTestApp, mockAdminSession, mockCustomerSession, clearSessions };
