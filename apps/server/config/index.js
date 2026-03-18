'use strict';

const required = (key) => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
};

const optional = (key, fallback = undefined) => process.env[key] || fallback;

const config = {
  env: optional('NODE_ENV', 'development'),
  port: parseInt(optional('PORT', '8080'), 10),
  isProd: process.env.NODE_ENV === 'production',

  session: {
    secret: optional('SESSION_SECRET', 'dev-secret-change-in-production'),
    adminTTL: 60 * 60 * 24,        // 24 hours in seconds
    customerTTL: 60 * 60 * 24 * 30, // 30 days in seconds
  },

  cors: {
    origins: optional('ALLOWED_ORIGINS', 'http://localhost:5173,http://localhost:3000')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  },

  supabase: {
    url: optional('SUPABASE_URL', ''),
    // NOTE: service role key is required for server-side DB access (bypasses RLS).
    // We keep SUPABASE_SERVICE_KEY for backward compatibility, but prefer SUPABASE_SERVICE_ROLE_KEY.
    serviceRoleKey: optional('SUPABASE_SERVICE_ROLE_KEY', ''),
    serviceKey: optional('SUPABASE_SERVICE_KEY', ''),
    accessToken: optional('SUPABASE_ACCESS_TOKEN', ''),
  },

  redis: {
    url: optional('REDIS_URL'),
  },

  twilio: {
    accountSid: optional('TWILIO_ACCOUNT_SID'),
    authToken: optional('TWILIO_AUTH_TOKEN'),
    phoneNumber: optional('TWILIO_PHONE_NUMBER'),
    get enabled() {
      return !!(this.accountSid && this.authToken && this.phoneNumber);
    },
  },

  email: {
    provider: optional('EMAIL_PROVIDER', 'resend'),
    apiKey: optional('EMAIL_API_KEY'),
    fromAddress: optional('EMAIL_FROM_ADDRESS', 'noreply@delivio.app'),
    get enabled() {
      return !!this.apiKey;
    },
  },

  stripe: {
    secretKey: optional('STRIPE_SECRET_KEY'),
    webhookSecret: optional('STRIPE_WEBHOOK_SECRET'),
    get enabled() {
      return !!this.secretKey;
    },
  },

  firebase: {
    serviceAccountJson: optional('FIREBASE_SERVICE_ACCOUNT_JSON'),
    get enabled() {
      return !!this.serviceAccountJson;
    },
  },

  google: {
    mapsApiKey: optional('GOOGLE_MAPS_API_KEY', ''),
  },

  sentry: {
    dsn: optional('SENTRY_DSN'),
    get enabled() {
      return !!this.dsn;
    },
  },

  jwt: {
    secret: optional('JWT_SECRET', 'dev-jwt-secret-change-in-production'),
    expiresIn: optional('JWT_EXPIRES_IN', '7d'),
  },

  otp: {
    ttl: 300,        // 5 minutes
    maxAttempts: 3,
    rateLimitCount: 3,
    rateLimitWindow: 900, // 15 minutes
  },

  rateLimit: {
    global: { windowMs: 60_000, max: 100 },
    auth: { windowMs: 60_000, max: 20 },
    payments: { windowMs: 60_000, max: 30 },
  },

  chat: {
    maxMessageLength: 2000,
    pageSize: 50,
  },

  location: {
    updateIntervalSeconds: 3, // min seconds between rider location updates
    cacheTTL: 300,            // 5 minutes
    flushIntervalSeconds: 30,
  },
};

module.exports = config;
