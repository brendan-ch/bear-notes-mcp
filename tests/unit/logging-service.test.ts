/**
 * LoggingService Unit Tests
 * Tests for structured logging, child loggers, performance tracking, and configuration
 */

import { LoggingService } from '../../src/services/logging-service.js';
import { ILoggingService } from '../../src/services/interfaces/index.js';

// Mock winston to avoid actual file operations during tests
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    close: jest.fn((callback?: () => void) => {
      if (callback) callback();
    }),
    level: 'info',
  })),
  format: {
    timestamp: jest.fn(() => ({ transform: jest.fn() })),
    metadata: jest.fn(() => ({ transform: jest.fn() })),
    printf: jest.fn(() => ({ transform: jest.fn() })),
    combine: jest.fn((...args) => ({ transform: jest.fn() })),
    colorize: jest.fn(() => ({ transform: jest.fn() })),
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn(),
  },
}));

describe('LoggingService', () => {
  let loggingService: LoggingService;
  let mockLogger: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      close: jest.fn((callback?: () => void) => {
        if (callback) callback();
      }),
      level: 'info',
    };

    // Mock winston.createLogger to return our mock
    const winston = require('winston');
    winston.createLogger.mockReturnValue(mockLogger);

    loggingService = new LoggingService();
  });

  afterEach(async () => {
    await loggingService.close();
  });

  describe('Constructor and Configuration', () => {
    it('should create LoggingService with default configuration', () => {
      expect(loggingService).toBeInstanceOf(LoggingService);
      expect(loggingService.getLevel()).toBe('info');
    });

    it('should create LoggingService with custom configuration', () => {
      const customService = new LoggingService({
        level: 'debug',
        enableConsole: false,
        enableFile: false,
        serviceName: 'test-service',
        environment: 'test',
      });

      expect(customService.getLevel()).toBe('debug');
      expect(customService.getConfig().serviceName).toBe('test-service');
      expect(customService.getConfig().environment).toBe('test');
    });

    it('should merge custom config with defaults', () => {
      const customService = new LoggingService({
        level: 'warn',
        serviceName: 'custom-service',
      });

      const config = customService.getConfig();
      expect(config.level).toBe('warn');
      expect(config.serviceName).toBe('custom-service');
      expect(config.enableConsole).toBe(true); // default value
      expect(config.enableFile).toBe(true); // default value
    });
  });

  describe('Core Logging Methods', () => {
    it('should log debug messages', () => {
      const message = 'Debug message';
      const meta = { key: 'value' };

      loggingService.debug(message, meta);

      expect(mockLogger.debug).toHaveBeenCalledWith(message, meta);
    });

    it('should log info messages', () => {
      const message = 'Info message';
      const meta = { key: 'value' };

      loggingService.info(message, meta);

      expect(mockLogger.info).toHaveBeenCalledWith(message, meta);
    });

    it('should log warning messages', () => {
      const message = 'Warning message';
      const meta = { key: 'value' };

      loggingService.warn(message, meta);

      expect(mockLogger.warn).toHaveBeenCalledWith(message, meta);
    });

    it('should log error messages without error object', () => {
      const message = 'Error message';
      const meta = { key: 'value' };

      loggingService.error(message, undefined, meta);

      expect(mockLogger.error).toHaveBeenCalledWith(message, meta);
    });

    it('should log error messages with Error object', () => {
      const message = 'Error message';
      const error = new Error('Test error');
      const meta = { key: 'value' };

      loggingService.error(message, error, meta);

      expect(mockLogger.error).toHaveBeenCalledWith(message, {
        ...meta,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      });
    });

    it('should log error messages with non-Error object', () => {
      const message = 'Error message';
      const error = { custom: 'error' };
      const meta = { key: 'value' };

      loggingService.error(message, error, meta);

      expect(mockLogger.error).toHaveBeenCalledWith(message, {
        ...meta,
        error,
      });
    });

    it('should handle empty metadata', () => {
      loggingService.info('Test message');
      expect(mockLogger.info).toHaveBeenCalledWith('Test message', {});
    });
  });

  describe('Child Loggers', () => {
    it('should create child logger with additional context', () => {
      const context = { module: 'test', requestId: '123' };
      const childLogger = loggingService.child(context);

      expect(childLogger).toBeInstanceOf(LoggingService);
      expect(childLogger).not.toBe(loggingService);
    });

    it('should inherit configuration from parent', () => {
      const parentConfig = (loggingService as any).getConfig();
      const childLogger = loggingService.child({ module: 'test' });
      const childConfig = (childLogger as any).getConfig();

      expect(childConfig.level).toBe(parentConfig.level);
      expect(childConfig.serviceName).toBe(parentConfig.serviceName);
      expect(childConfig.environment).toBe(parentConfig.environment);
    });

    it('should chain child contexts', () => {
      const firstChild = loggingService.child({ module: 'auth' });
      const secondChild = firstChild.child({ action: 'login' });

      expect(secondChild).toBeInstanceOf(LoggingService);
    });
  });

  describe('Performance Logging', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should start and end timer', () => {
      const label = 'test-operation';
      const endTimer = loggingService.startTimer(label);

      expect(mockLogger.debug).toHaveBeenCalledWith(`Timer started: ${label}`, {});

      // Advance time by 100ms
      jest.advanceTimersByTime(100);

      endTimer();

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Operation completed: ${label}`,
        expect.objectContaining({
          operation: label,
          duration: 100,
          durationMs: '100ms',
          performance: true,
        })
      );
    });

    it('should log slow operations as warnings', () => {
      const operation = 'slow-operation';
      const duration = 1500; // > 1000ms threshold

      loggingService.logPerformance(operation, duration);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Slow operation detected: ${operation}`,
        expect.objectContaining({
          operation,
          duration,
          durationMs: '1500ms',
          performance: true,
        })
      );
    });

    it('should log fast operations as info', () => {
      const operation = 'fast-operation';
      const duration = 500; // < 1000ms threshold

      loggingService.logPerformance(operation, duration);

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Operation completed: ${operation}`,
        expect.objectContaining({
          operation,
          duration,
          durationMs: '500ms',
          performance: true,
        })
      );
    });

    it('should include additional metadata in performance logs', () => {
      const operation = 'test-operation';
      const duration = 200;
      const meta = { userId: '123', action: 'read' };

      loggingService.logPerformance(operation, duration, meta);

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Operation completed: ${operation}`,
        expect.objectContaining({
          ...meta,
          operation,
          duration,
          performance: true,
        })
      );
    });
  });

  describe('Health Check Logging', () => {
    it('should log healthy service as debug', () => {
      const service = 'database';
      const details = { responseTime: 50 };

      loggingService.logHealthCheck(service, 'healthy', details);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Health check passed: ${service}`,
        expect.objectContaining({
          service,
          status: 'healthy',
          ...details,
          healthCheck: true,
        })
      );
    });

    it('should log degraded service as warning', () => {
      const service = 'cache';
      const details = { responseTime: 800, reason: 'high latency' };

      loggingService.logHealthCheck(service, 'degraded', details);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Health check degraded: ${service}`,
        expect.objectContaining({
          service,
          status: 'degraded',
          ...details,
          healthCheck: true,
        })
      );
    });

    it('should log unhealthy service as error', () => {
      const service = 'external-api';
      const details = { error: 'Connection refused' };

      loggingService.logHealthCheck(service, 'unhealthy', details);

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Health check failed: ${service}`,
        expect.objectContaining({
          service,
          status: 'unhealthy',
          ...details,
          healthCheck: true,
        })
      );
    });
  });

  describe('System Metrics Logging', () => {
    it('should log system metrics with uptime', () => {
      const metrics = {
        memory: { used: 1000000, total: 8000000 },
        cpu: { usage: 25.5 },
      };

      loggingService.logSystemMetrics(metrics);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'System metrics',
        expect.objectContaining({
          ...metrics,
          systemMetrics: true,
          uptime: expect.any(Number),
        })
      );
    });
  });

  describe('Service Lifecycle Logging', () => {
    it('should log service start', () => {
      const serviceName = 'test-service';
      const version = '1.0.0';

      loggingService.logServiceStart(serviceName, version);

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Service started: ${serviceName}`,
        expect.objectContaining({
          serviceName,
          version,
          lifecycle: 'start',
          timestamp: expect.any(String),
        })
      );
    });

    it('should log service start without version', () => {
      const serviceName = 'test-service';

      loggingService.logServiceStart(serviceName);

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Service started: ${serviceName}`,
        expect.objectContaining({
          serviceName,
          version: undefined,
          lifecycle: 'start',
        })
      );
    });

    it('should log service stop', () => {
      const serviceName = 'test-service';
      const reason = 'shutdown';

      loggingService.logServiceStop(serviceName, reason);

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Service stopped: ${serviceName}`,
        expect.objectContaining({
          serviceName,
          reason,
          lifecycle: 'stop',
          uptime: expect.any(Number),
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('Database Operation Logging', () => {
    it('should log successful database operation as debug', () => {
      const operation = 'SELECT * FROM notes';
      const duration = 50;
      const rowsAffected = 10;

      loggingService.logDatabaseOperation(operation, duration, rowsAffected);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Database operation completed: ${operation}`,
        expect.objectContaining({
          operation,
          duration,
          durationMs: '50ms',
          rowsAffected,
          database: true,
        })
      );
    });

    it('should log slow database operation as warning', () => {
      const operation = 'COMPLEX JOIN QUERY';
      const duration = 1500;

      loggingService.logDatabaseOperation(operation, duration);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Slow database operation: ${operation}`,
        expect.objectContaining({
          operation,
          duration,
          database: true,
        })
      );
    });

    it('should log failed database operation as error', () => {
      const operation = 'INSERT INTO notes';
      const duration = 100;
      const error = new Error('Constraint violation');

      loggingService.logDatabaseOperation(operation, duration, undefined, error);

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Database operation failed: ${operation}`,
        expect.objectContaining({
          operation,
          duration,
          database: true,
          error: expect.objectContaining({
            name: 'Error',
            message: 'Constraint violation',
            stack: expect.any(String),
          }),
        })
      );
    });
  });

  describe('Security and Audit Logging', () => {
    it('should log security events as warnings', () => {
      const event = 'failed-login';
      const details = { ip: '192.168.1.1', attempts: 3 };

      loggingService.logSecurityEvent(event, details);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Security event: ${event}`,
        expect.objectContaining({
          event,
          ...details,
          security: true,
          timestamp: expect.any(String),
        })
      );
    });

    it('should log audit events', () => {
      const action = 'delete';
      const resource = 'note:123';
      const user = 'admin';
      const details = { reason: 'cleanup' };

      loggingService.logAuditEvent(action, resource, user, details);

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Audit: ${action} on ${resource}`,
        expect.objectContaining({
          action,
          resource,
          user,
          ...details,
          audit: true,
          timestamp: expect.any(String),
        })
      );
    });

    it('should log audit events without user', () => {
      const action = 'create';
      const resource = 'note:456';

      loggingService.logAuditEvent(action, resource);

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Audit: ${action} on ${resource}`,
        expect.objectContaining({
          action,
          resource,
          user: undefined,
          audit: true,
        })
      );
    });
  });

  describe('Configuration Management', () => {
    it('should set and get log level', () => {
      loggingService.setLevel('debug');
      expect(loggingService.getLevel()).toBe('debug');
      expect(mockLogger.level).toBe('debug');
    });

    it('should log level change', () => {
      loggingService.setLevel('warn');
      expect(mockLogger.info).toHaveBeenCalledWith('Log level changed to: warn', {});
    });

    it('should get current configuration', () => {
      const config = loggingService.getConfig();
      expect(config).toEqual(expect.objectContaining({
        level: expect.any(String),
        enableConsole: expect.any(Boolean),
        enableFile: expect.any(Boolean),
        serviceName: expect.any(String),
        environment: expect.any(String),
      }));
    });

    it('should update configuration', () => {
      const newConfig = {
        level: 'error' as const,
        serviceName: 'updated-service',
      };

      loggingService.updateConfig(newConfig);

      const config = loggingService.getConfig();
      expect(config.level).toBe('error');
      expect(config.serviceName).toBe('updated-service');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Logger configuration updated',
        expect.objectContaining({ config: expect.any(Object) })
      );
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should close logger', async () => {
      await loggingService.close();
      expect(mockLogger.close).toHaveBeenCalled();
    });

    it('should handle close callback', async () => {
      const closePromise = loggingService.close();
      await expect(closePromise).resolves.toBeUndefined();
    });
  });

  describe('Interface Compliance', () => {
    it('should implement ILoggingService interface', () => {
      expect(loggingService).toEqual(expect.objectContaining({
        debug: expect.any(Function),
        info: expect.any(Function),
        warn: expect.any(Function),
        error: expect.any(Function),
        child: expect.any(Function),
        startTimer: expect.any(Function),
        logPerformance: expect.any(Function),
        logHealthCheck: expect.any(Function),
        logSystemMetrics: expect.any(Function),
        logServiceStart: expect.any(Function),
        logServiceStop: expect.any(Function),
        logDatabaseOperation: expect.any(Function),
        logSecurityEvent: expect.any(Function),
        logAuditEvent: expect.any(Function),
        setLevel: expect.any(Function),
        getLevel: expect.any(Function),
        close: expect.any(Function),
      }));
    });

    it('should satisfy ILoggingService type', () => {
      // This test ensures TypeScript compatibility
      const service: ILoggingService = loggingService;
      expect(service).toBeDefined();
    });
  });
}); 