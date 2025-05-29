import { getCurrentContext, als } from '../context';
import type { Kysely } from 'kysely';
import { RequestCache } from '../cache/RequestCache';
import type { RequestState } from '../context';

interface WrittenRecord {
  table: string;
  id: string | number;
}

export class BaseModel {
  /**
   * Run a function within a transaction context.
   * The DB instance is replaced with the transaction instance for the duration.
   * Tracks written records for surgical cache invalidation on commit.
   */
  static async withTransaction<T>(fn: () => Promise<T>): Promise<T> {
    const state = getCurrentContext();
    if (!state?.db)
      throw new Error(
        'No database context available. Set the DB instance before using withTransaction.',
      );
    return state.db.transaction().execute(async (trx) => {
      const txState: RequestState = {
        db: trx,
        cache: state.cache, // for post-commit invalidation only
        writtenRecords: new Set<string>(),
        dataLoaders: new Map(), // fresh for transaction
      };
      let result: T;
      let error: unknown;
      await als.run(txState, async () => {
        try {
          result = await fn();
        } catch (e) {
          error = e;
        }
      });
      // On commit, surgically invalidate cache for written records
      if (!error && txState.writtenRecords && txState.writtenRecords.size > 0) {
        for (const key of txState.writtenRecords) {
          const [table, id] = key.split(':');
          state.cache.invalidateKeysForId(table, id);
        }
      }
      if (error) throw error;
      return result!;
    });
  }

  /**
   * Get the current DB instance (main or transaction) from ALS.
   */
  static getCurrentDb<T = any>(): Kysely<T> | undefined {
    return getCurrentContext()?.db as Kysely<T> | undefined;
  }

  /**
   * Get the current request cache from ALS.
   * @internal
   */
  static getCurrentCache(): RequestCache | undefined {
    return getCurrentContext()?.cache;
  }

  /**
   * Returns true if currently inside a transaction context.
   * @internal
   */
  static inTransaction(): boolean {
    return !!getCurrentContext()?.writtenRecords;
  }

  /**
   * For repository use: record a write to {table, id} if inside a transaction.
   * @internal
   */
  static recordWrite(table: string, id: string | number): void {
    const state = getCurrentContext();
    if (state?.writtenRecords) {
      state.writtenRecords.add(`${table}:${id}`);
    }
  }

  /**
   * Get or create a DataLoader for a given table and idField, scoped to the current request/transaction.
   * @internal
   */
  static getDataLoader<K, V>(key: string, create: () => unknown): unknown {
    const state = getCurrentContext();
    if (!state) throw new Error('No request context available');
    if (!state.dataLoaders) state.dataLoaders = new Map();
    if (!state.dataLoaders.has(key)) {
      state.dataLoaders.set(key, create());
    }
    return state.dataLoaders.get(key)!;
  }
}
