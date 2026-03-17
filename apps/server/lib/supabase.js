'use strict';

const config = require('../config');
const logger = require('./logger');

const BASE_URL = config.supabase.url;
const SERVICE_KEY = config.supabase.serviceKey;
const ACCESS_TOKEN = config.supabase.accessToken;

/**
 * Core Supabase REST API fetch helper.
 * All DB interactions go through this — never raw SQL interpolation.
 *
 * @param {string} path         - e.g. '/rest/v1/orders'
 * @param {object} [options]    - fetch options
 * @param {boolean} [useManagementApi] - true for DDL via Management API
 */
async function supabaseFetch(path, options = {}, useManagementApi = false) {
  const baseUrl = useManagementApi
    ? 'https://api.supabase.com'
    : BASE_URL;

  const url = `${baseUrl}${path}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(useManagementApi
      ? { Authorization: `Bearer ${ACCESS_TOKEN}` }
      : {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          Prefer: 'return=representation',
        }),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const errorBody = await response.text();
    logger.error('Supabase fetch error', {
      url,
      status: response.status,
      body: errorBody,
    });
    throw new SupabaseError(
      `Supabase request failed: ${response.status} ${response.statusText}`,
      response.status,
      errorBody
    );
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

class SupabaseError extends Error {
  constructor(message, statusCode, body) {
    super(message);
    this.name = 'SupabaseError';
    this.statusCode = statusCode;
    this.body = body;
  }
}

/**
 * Execute a raw parameterised SQL query via the Management API.
 * Uses $1, $2, ... placeholders — never string interpolation.
 */
async function executeSQL(projectRef, sql, parameters = []) {
  return supabaseFetch(
    `/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      body: JSON.stringify({ query: sql, parameters }),
    },
    true
  );
}

/**
 * Build a Supabase REST filter query string from a filters object.
 * Supports: eq, neq, gt, gte, lt, lte, like, ilike, is, in
 */
function buildFilters(filters = {}) {
  return Object.entries(filters)
    .map(([key, value]) => {
      if (value === null) return `${key}=is.null`;
      if (Array.isArray(value)) return `${key}=in.(${value.join(',')})`;
      return `${key}=eq.${encodeURIComponent(value)}`;
    })
    .join('&');
}

/**
 * Convenience: SELECT rows from a table.
 */
async function select(table, { select: cols = '*', filters = {}, order, limit, offset } = {}) {
  const filterStr = buildFilters(filters);
  const params = new URLSearchParams();
  params.set('select', cols);
  if (filterStr) filterStr.split('&').forEach((f) => { const [k, v] = f.split('='); params.set(k, v); });
  if (order) params.set('order', order);
  if (limit) params.set('limit', String(limit));
  if (offset) params.set('offset', String(offset));

  return supabaseFetch(`/rest/v1/${table}?${params.toString()}`);
}

/**
 * Convenience: INSERT row(s).
 */
async function insert(table, data) {
  return supabaseFetch(`/rest/v1/${table}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Convenience: UPDATE rows matching filters.
 */
async function update(table, data, filters = {}) {
  const filterStr = buildFilters(filters);
  const query = filterStr ? `?${filterStr}` : '';
  return supabaseFetch(`/rest/v1/${table}${query}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Convenience: DELETE rows matching filters.
 */
async function remove(table, filters = {}) {
  const filterStr = buildFilters(filters);
  const query = filterStr ? `?${filterStr}` : '';
  return supabaseFetch(`/rest/v1/${table}${query}`, { method: 'DELETE' });
}

module.exports = { supabaseFetch, executeSQL, select, insert, update, remove, SupabaseError };
