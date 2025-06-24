/**
 * Service Bootstrap
 * Registers all services in the dependency injection container
 */

import { globalContainer } from './container/service-container.js';
import { SERVICE_TOKENS } from './interfaces/index.js';
import { DatabaseService } from './database-service.js';
import { NoteService } from './note-service.js';
import { SearchService } from './search-service.js';
import { TagService } from './tag-service.js';
import { CacheService } from './cache-service.js';
import { PerformanceService } from './performance-service.js';
import { ValidationService } from './validation-service.js';
import { LoggingService } from './logging-service.js';
import { HealthService } from './health-service.js';
import { config } from '../config/index.js';

/**
 * Bootstrap all services and register them in the container
 */
export function bootstrapServices(): void {
  // Register DatabaseService as singleton
  globalContainer.registerSingleton(
    SERVICE_TOKENS.DATABASE_SERVICE,
    () => new DatabaseService(config.database.bearDbPath)
  );

  // Register NoteService as singleton
  globalContainer.registerSingleton(
    SERVICE_TOKENS.NOTE_SERVICE,
    () => new NoteService()
  );

  // Register SearchService as singleton
  globalContainer.registerSingleton(
    SERVICE_TOKENS.SEARCH_SERVICE,
    () => new SearchService()
  );

  // Register TagService as singleton
  globalContainer.registerSingleton(
    SERVICE_TOKENS.TAG_SERVICE,
    () => new TagService()
  );

  // Register CacheService as singleton
  globalContainer.registerSingleton(
    SERVICE_TOKENS.CACHE_SERVICE,
    () => new CacheService({
      maxSize: config.performance.cacheEnabled ? 1000 : 0,
      ttl: config.performance.cacheTtl * 1000,
      enableMetrics: true,
    })
  );

  // Register PerformanceService as singleton
  globalContainer.registerSingleton(
    SERVICE_TOKENS.PERFORMANCE_SERVICE,
    () => new PerformanceService()
  );

  // Register ValidationService as singleton
  globalContainer.registerSingleton(
    SERVICE_TOKENS.VALIDATION_SERVICE,
    () => new ValidationService()
  );

  // Register LoggingService as singleton
  globalContainer.registerSingleton(
    SERVICE_TOKENS.LOGGING_SERVICE,
    () => new LoggingService({
      level: config.env === 'development' ? 'debug' : 'info',
      enableConsole: true,
      enableFile: true,
      logDir: './logs',
      serviceName: 'bear-mcp-server',
      environment: config.env,
    })
  );

  // Register HealthService as singleton (with dependencies)
  globalContainer.registerSingleton(
    SERVICE_TOKENS.HEALTH_SERVICE,
    () => {
      const databaseService = globalContainer.resolve(SERVICE_TOKENS.DATABASE_SERVICE) as any;
      const cacheService = globalContainer.resolve(SERVICE_TOKENS.CACHE_SERVICE) as any;
      return new HealthService({}, databaseService, cacheService);
    }
  );

  // TODO: Register other services as they are created
  // globalContainer.registerSingleton(SERVICE_TOKENS.ANALYTICS_SERVICE, () => new AnalyticsService());
  // globalContainer.registerSingleton(SERVICE_TOKENS.BEAR_API_SERVICE, () => new BearApiService());
  // globalContainer.registerSingleton(SERVICE_TOKENS.FILE_SYSTEM_SERVICE, () => new FileSystemService());
}

/**
 * Dispose all services and clean up the container
 */
export async function disposeServices(): Promise<void> {
  await globalContainer.dispose();
}

/**
 * Check if services are properly registered
 */
export function validateServiceRegistration(): void {
  const requiredServices = [
    SERVICE_TOKENS.DATABASE_SERVICE,
    SERVICE_TOKENS.NOTE_SERVICE,
    SERVICE_TOKENS.SEARCH_SERVICE,
    SERVICE_TOKENS.TAG_SERVICE,
    SERVICE_TOKENS.CACHE_SERVICE,
    SERVICE_TOKENS.PERFORMANCE_SERVICE,
    SERVICE_TOKENS.VALIDATION_SERVICE,
    SERVICE_TOKENS.LOGGING_SERVICE,
    SERVICE_TOKENS.HEALTH_SERVICE,
  ];

  const missingServices = requiredServices.filter(
    token => !globalContainer.isRegistered(token)
  );

  if (missingServices.length > 0) {
    throw new Error(`Missing service registrations: ${missingServices.join(', ')}`);
  }
} 