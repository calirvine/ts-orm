import { AsyncLocalStorage } from 'node:async_hooks';
import type { OrmQueryEngine } from './database/adapter';
import { RequestCache } from './cache/RequestCache';

/**
 * ORM context configuration options
 */
export interface ORMContextConfig {
  db: OrmQueryEngine;
  cache?: RequestCache;
}

export interface RequestState {
  db: OrmQueryEngine;
  cache: RequestCache;
  writtenRecords?: Set<string>; // Only present in transaction context
  dataLoaders: Map<string, unknown>;
}

export const als = new AsyncLocalStorage<RequestState>();

/**
 * Create a new ORM context. Use the returned object's run(fn) to execute code within this context.
 * Each run gets a fresh cache and DataLoader registry.
 * @param config - ORM context configuration
 * @returns { run: (fn: () => Promise<T>) => Promise<T> }
 * @example
 * const orm = createORMContext({ db: myKyselyInstance });
 * await orm.run(async () => { ... });
 */
export function createORMContext(config: ORMContextConfig) {
  return {
    async run<T>(fn: () => Promise<T>): Promise<T> {
      const state: RequestState = {
        db: config.db,
        cache: config.cache ?? new RequestCache(),
        dataLoaders: new Map(),
      };
      return als.run(state, fn);
    },
  };
}

/**
 * Get the current ORM context (db, cache, etc). Used internally by models.
 * Throws if not in a context.
 */
export function getCurrentContext(): RequestState {
  const ctx = als.getStore();
  if (!ctx) {
    throw new Error('No ORM context found. Did you forget to wrap your code in orm.run?');
  }
  return ctx;
}
