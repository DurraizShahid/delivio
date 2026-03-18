'use strict';

const { WebSocketServer, WebSocket } = require('ws');
const { v4: uuidv4 } = require('uuid');
const { parse: parseCookie } = require('cookie');
const jwt = require('jsonwebtoken');
const { getAdminSession, getCustomerSession } = require('../services/session.service');
const config = require('../config');
const logger = require('../lib/logger');

/**
 * Connection registry: Map<projectRef, Map<connectionId, { ws, userId, role }>>
 */
const registry = new Map();

let wss = null;

/**
 * Initialise the WebSocket server attached to the existing HTTP server.
 * @param {import('http').Server} httpServer
 */
function init(httpServer) {
  wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', async (ws, req) => {
    let identity = null;

    try {
      identity = await authenticate(req);
    } catch (err) {
      logger.warn('WS auth failed', { error: err.message });
      ws.close(4001, 'Authentication failed');
      return;
    }

    if (!identity) {
      ws.close(4001, 'Authentication required');
      return;
    }

    const connectionId = uuidv4();
    const { projectRef, userId, role } = identity;

    // Register connection
    if (!registry.has(projectRef)) registry.set(projectRef, new Map());
    registry.get(projectRef).set(connectionId, { ws, userId, role, alive: true });

    logger.debug('WS connected', { connectionId, userId, projectRef, role });

    // Heartbeat
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (data) => handleMessage(ws, data, identity, connectionId));

    ws.on('close', () => {
      const projectConns = registry.get(projectRef);
      if (projectConns) {
        projectConns.delete(connectionId);
        if (projectConns.size === 0) registry.delete(projectRef);
      }
      logger.debug('WS disconnected', { connectionId, userId });
    });

    ws.on('error', (err) => {
      logger.error('WS error', { connectionId, error: err.message });
    });

    // Send connection ACK
    safeSend(ws, { type: 'connected', connectionId });
  });

  // Heartbeat interval — ping every 30s, terminate unresponsive after 10s
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) {
        logger.debug('WS: terminating unresponsive connection');
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30_000);

  wss.on('close', () => clearInterval(heartbeatInterval));

  logger.info('WebSocket server initialised at /ws');
  return wss;
}

/**
 * Authenticate an incoming WebSocket upgrade request.
 * Supports: admin_session cookie, customer_session cookie, ?token= JWT query param.
 */
async function authenticate(req) {
  const cookieHeader = req.headers.cookie || '';
  const cookies = parseCookie(cookieHeader);

  // Admin session cookie
  if (cookies.admin_session) {
    const session = await getAdminSession(cookies.admin_session);
    if (session) return session;
  }

  // Customer session cookie
  if (cookies.customer_session) {
    const session = await getCustomerSession(cookies.customer_session);
    if (session) return session;
  }

  // JWT query param (mobile apps / public tracking)
  const url = new URL(req.url, 'http://localhost');
  const token = url.searchParams.get('token');
  if (token) {
    try {
      const payload = jwt.verify(token, config.jwt.secret);
      return payload;
    } catch {
      return null;
    }
  }

  return null;
}

function handleMessage(ws, data, identity, connectionId) {
  let msg;
  try {
    msg = JSON.parse(data.toString());
  } catch {
    safeSend(ws, { type: 'error', message: 'Invalid JSON' });
    return;
  }

  if (msg.type === 'ping') {
    safeSend(ws, { type: 'pong' });
  }
  // Typing indicator relay
  else if (msg.type === 'chat:typing' && msg.conversationId) {
    broadcast(identity.projectRef, {
      type: 'chat:typing',
      conversationId: msg.conversationId,
      userId: identity.userId,
      isTyping: !!msg.isTyping,
    });
  }
}

/**
 * Broadcast a message to ALL connections in a project workspace.
 *
 * Supported event types:
 *   order:status_changed  — order status transitioned
 *   order:rejected        — vendor rejected an order
 *   order:delayed         — SLA deadline breached
 *   delivery:location_update — rider GPS ping
 *   delivery:rider_arrived   — rider tapped "arrived"
 *   delivery:rider_assigned  — rider assigned to delivery
 *   delivery:request         — new delivery available for riders
 *   chat:typing              — typing indicator relay
 */
function broadcast(projectRef, message) {
  const projectConns = registry.get(projectRef);
  if (!projectConns) return 0;

  const payload = JSON.stringify(message);
  let count = 0;
  for (const { ws } of projectConns.values()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
      count++;
    }
  }
  return count;
}

/**
 * Send a message to a specific user's connections within a project.
 */
function sendToUser(projectRef, userId, message) {
  const projectConns = registry.get(projectRef);
  if (!projectConns) return 0;

  const payload = JSON.stringify(message);
  let count = 0;
  for (const { ws, userId: connUserId } of projectConns.values()) {
    if (connUserId === userId && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
      count++;
    }
  }
  return count;
}

/**
 * Check if a user has at least one active WebSocket connection in the project.
 */
function isUserOnline(projectRef, userId) {
  const projectConns = registry.get(projectRef);
  if (!projectConns) return false;

  for (const { userId: connUserId, ws } of projectConns.values()) {
    if (connUserId === userId && ws.readyState === WebSocket.OPEN) return true;
  }
  return false;
}

/**
 * List unique user IDs with at least one active connection for a role.
 */
function listOnlineUsersByRole(projectRef, role) {
  const projectConns = registry.get(projectRef);
  if (!projectConns) return [];

  const ids = new Set();
  for (const { userId, role: connRole, ws } of projectConns.values()) {
    if (connRole === role && ws.readyState === WebSocket.OPEN) ids.add(userId);
  }
  return Array.from(ids);
}

function safeSend(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function getStats() {
  const stats = {};
  for (const [projectRef, conns] of registry.entries()) {
    stats[projectRef] = conns.size;
  }
  return stats;
}

module.exports = { init, broadcast, sendToUser, isUserOnline, listOnlineUsersByRole, getStats };
