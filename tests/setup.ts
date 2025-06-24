/**
 * Jest Test Setup
 * Global configuration and utilities for all tests
 */

import { jest } from '@jest/globals';

// Extend Jest timeout for database operations
jest.setTimeout(10000);

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidBearNote(): R;
      toBeValidBearTag(): R;
      toHaveValidTimestamp(): R;
    }
  }
}

// Custom Jest matchers for Bear-specific data validation
expect.extend({
  toBeValidBearNote(received: any) {
    const pass =
      typeof received === 'object' &&
      received !== null &&
      typeof received.Z_PK === 'number' &&
      (received.ZTITLE === null || typeof received.ZTITLE === 'string') &&
      (received.ZTEXT === null || typeof received.ZTEXT === 'string') &&
      typeof received.ZCREATIONDATE === 'number' &&
      typeof received.ZMODIFICATIONDATE === 'number' &&
      typeof received.ZTRASHED === 'number' &&
      typeof received.ZARCHIVED === 'number';

    return {
      message: () =>
        pass
          ? `Expected ${received} not to be a valid Bear note`
          : `Expected ${received} to be a valid Bear note with required properties`,
      pass,
    };
  },

  toBeValidBearTag(received: any) {
    const pass =
      typeof received === 'object' &&
      received !== null &&
      typeof received.Z_PK === 'number' &&
      typeof received.ZTITLE === 'string' &&
      typeof received.ZCREATIONDATE === 'number' &&
      typeof received.ZMODIFICATIONDATE === 'number';

    return {
      message: () =>
        pass
          ? `Expected ${received} not to be a valid Bear tag`
          : `Expected ${received} to be a valid Bear tag with required properties`,
      pass,
    };
  },

  toHaveValidTimestamp(received: any) {
    const pass =
      typeof received === 'number' &&
      received > 0 &&
      // Core Data timestamps are seconds since 2001-01-01
      received > 631152000; // Reasonable minimum timestamp

    return {
      message: () =>
        pass
          ? `Expected ${received} not to be a valid Core Data timestamp`
          : `Expected ${received} to be a valid Core Data timestamp (seconds since 2001-01-01)`,
      pass,
    };
  },
});

// Mock console methods in tests to reduce noise
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  // Suppress console output in tests unless explicitly enabled
  if (!process.env.JEST_VERBOSE) {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  }
});

afterEach(() => {
  // Restore console methods
  if (!process.env.JEST_VERBOSE) {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  }
});

// Test environment checks
beforeAll(() => {
  // Ensure we're in test environment
  if (process.env.NODE_ENV !== 'test') {
    console.warn('Warning: Tests should run with NODE_ENV=test');
  }

  // Check for required test dependencies
  const requiredEnvVars = [];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.warn(`Warning: Missing environment variables: ${missingVars.join(', ')}`);
  }
});

export {};
