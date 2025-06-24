/**
 * Simple Dependency Injection Container
 * Manages service instances and their dependencies
 */

import { IServiceContainer } from '../interfaces/index.js';

type ServiceFactory<T = any> = () => T;

interface ServiceRegistration {
  factory: ServiceFactory;
  singleton: boolean;
  instance?: any;
}

export class ServiceContainer implements IServiceContainer {
  private services = new Map<string, ServiceRegistration>();
  private disposables: Array<{ dispose(): Promise<void> }> = [];

  /**
   * Register a transient service (new instance each time)
   */
  register<T>(token: string, factory: ServiceFactory<T>): void {
    this.services.set(token, {
      factory,
      singleton: false,
    });
  }

  /**
   * Register a singleton service (same instance each time)
   */
  registerSingleton<T>(token: string, factory: ServiceFactory<T>): void {
    this.services.set(token, {
      factory,
      singleton: true,
    });
  }

  /**
   * Resolve a service by token
   */
  resolve<T>(token: string): T {
    const registration = this.services.get(token);
    
    if (!registration) {
      throw new Error(`Service not registered: ${token}`);
    }

    // Return existing singleton instance if available
    if (registration.singleton && registration.instance) {
      return registration.instance;
    }

    // Create new instance
    const instance = registration.factory();

    // Store singleton instance
    if (registration.singleton) {
      registration.instance = instance;
      
      // Track disposable services
      if (instance && typeof instance.dispose === 'function') {
        this.disposables.push(instance);
      }
    }

    return instance;
  }

  /**
   * Check if a service is registered
   */
  isRegistered(token: string): boolean {
    return this.services.has(token);
  }

  /**
   * Get all registered service tokens
   */
  getRegisteredTokens(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Clear a specific service registration
   */
  unregister(token: string): boolean {
    const registration = this.services.get(token);
    if (!registration) {
      return false;
    }

    // Remove from disposables if it's a singleton
    if (registration.singleton && registration.instance) {
      const index = this.disposables.indexOf(registration.instance);
      if (index >= 0) {
        this.disposables.splice(index, 1);
      }
    }

    return this.services.delete(token);
  }

  /**
   * Dispose all services and clear container
   */
  async dispose(): Promise<void> {
    // Dispose all disposable services
    const disposePromises = this.disposables.map(service => {
      try {
        return service.dispose();
      } catch (error) {
        console.error('Error disposing service:', error);
        return Promise.resolve();
      }
    });

    await Promise.allSettled(disposePromises);

    // Clear all registrations
    this.services.clear();
    this.disposables.length = 0;
  }

  /**
   * Create a child container that inherits from this one
   */
  createChild(): ServiceContainer {
    const child = new ServiceContainer();
    
    // Copy all registrations to child
    for (const [token, registration] of this.services.entries()) {
      child.services.set(token, {
        factory: registration.factory,
        singleton: registration.singleton,
        // Don't copy instance - child will create its own
      });
    }

    return child;
  }

  /**
   * Get service registration info (for debugging)
   */
  getRegistrationInfo(token: string): {
    exists: boolean;
    singleton: boolean;
    hasInstance: boolean;
  } | null {
    const registration = this.services.get(token);
    
    if (!registration) {
      return null;
    }

    return {
      exists: true,
      singleton: registration.singleton,
      hasInstance: !!registration.instance,
    };
  }
}

/**
 * Global service container instance
 * Can be used throughout the application
 */
export const globalContainer = new ServiceContainer(); 