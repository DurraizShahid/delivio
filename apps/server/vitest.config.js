'use strict';

/** @type {import('vitest').UserConfig} */
module.exports = {
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: [
        'controllers/**/*.js',
        'routes/**/*.js',
        'models/**/*.js',
        'services/**/*.js',
        'middleware/**/*.js',
      ],
      exclude: [
        'migrations/**',
        'jobs/**',
        'tests/**',
        'websocket/**',
        'config/**',
        'lib/logger.js',
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 50,
        statements: 60,
      },
    },
  },
};
