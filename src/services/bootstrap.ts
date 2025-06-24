/**
 * Service Bootstrap
 * Registers all services in the dependency injection container
 */

import { globalContainer } from './container/service-container.js';
import { SERVICE_TOKENS } from './interfaces/index.js';
import { DatabaseService } from './database-service.js';
import { NoteService } from './note-service.js';
import { SearchService } from './search-service.js';
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

  // TODO: Register other services as they are created
  // globalContainer.registerSingleton(SERVICE_TOKENS.TAG_SERVICE, () => new TagService());
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
  ];

  const missingServices = requiredServices.filter(
    token => !globalContainer.isRegistered(token)
  );

  if (missingServices.length > 0) {
    throw new Error(`Missing service registrations: ${missingServices.join(', ')}`);
  }
} 