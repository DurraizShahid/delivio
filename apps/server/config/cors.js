'use strict';

const config = require('./index');

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    const normalizedOrigin = String(origin).trim().toLowerCase();
    const allowed = config.cors.origins.map((o) => String(o).trim().toLowerCase());

    // In development, allow any localhost port to reduce friction across apps
    // (customer/vendor/rider/admin all run on different ports).
    if (!config.isProd) {
      const isLocalhost =
        /^https?:\/\/localhost(:\d+)?$/.test(normalizedOrigin) ||
        /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(normalizedOrigin);
      if (isLocalhost) return callback(null, true);
    }

    if (allowed.includes(normalizedOrigin)) {
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
