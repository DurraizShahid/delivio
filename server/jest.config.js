'use strict';

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  setupFiles: ['<rootDir>/tests/setup.js'],
  clearMocks: true,         // Reset mock.calls/mock.results between tests
  restoreMocks: false,      // Keep mock implementations (use mockReset for full reset)
  collectCoverageFrom: [
    'controllers/**/*.js',
    'routes/**/*.js',
    'models/**/*.js',
    'services/**/*.js',
    'middleware/**/*.js',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/migrations/',
    '/jobs/',
    '/tests/',
    '/websocket/',
    '/config/',
    'lib/logger.js',
  ],
  coverageThreshold: {
    global: {
      lines: 60,
      functions: 60,
      branches: 50,
      statements: 60,
    },
  },
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'json', 'html'],
  verbose: true,
};
