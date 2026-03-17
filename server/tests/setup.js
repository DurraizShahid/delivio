'use strict';

/**
 * Global test setup — runs before every test file.
 * Sets environment variables before any module is imported.
 */

process.env.NODE_ENV = 'test';
process.env.PORT = '0'; // Let OS assign a free port
process.env.SESSION_SECRET = 'test-session-secret-minimum-32-chars';
process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-chars!!';
process.env.SUPABASE_URL = 'https://testprojectref.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.SUPABASE_ACCESS_TOKEN = 'test-access-token';
process.env.ALLOWED_ORIGINS = 'http://localhost:5173';
process.env.GOOGLE_MAPS_API_KEY = 'test-maps-key';

// Disable all optional services so tests run without credentials
delete process.env.REDIS_URL;
delete process.env.TWILIO_ACCOUNT_SID;
delete process.env.STRIPE_SECRET_KEY;
delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
delete process.env.SENTRY_DSN;
delete process.env.EMAIL_API_KEY;
