'use strict';

const config = require('./index');

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    if (config.cors.origins.includes(origin)) {
      return callback(null, true);
    }

    callback(new Error(`CORS policy: origin '${origin}' is not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Request-Id'],
  maxAge: 86400, // 24h preflight cache
};

module.exports = corsOptions;
