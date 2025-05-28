import { AsyncLocalStorage } from 'node:async_hooks';
import type { Kysely } from 'kysely';

// ALS context for the current DB instance (Kysely or transaction)
const dbContext = new AsyncLocalStorage<Kysely<any>>();

export class BaseModel {
  /**
   * Run a function within a transaction context.
   * The DB instance is replaced with the transaction instance for the duration.
   */
  static async withTransaction<T>(fn: () => Promise<T>): Promise<T> {
    const db = BaseModel.getCurrentDb();
    if (!db)
      throw new Error(
        'No database context available. Set the DB instance before using withTransaction.',
      );
    return db.transaction().execute(async (trx) => {
      return await dbContext.run(trx, fn);
    });
  }

  /**
   * Get the current DB instance (main or transaction) from ALS.
   */
  static getCurrentDb<T = any>(): Kysely<T> | undefined {
    return dbContext.getStore() as Kysely<T> | undefined;
  }
}

// Test-only utility to set the DB context
export const __testSetDbContext = (db: Kysely<any>, fn: () => Promise<any>) =>
  dbContext.run(db, fn);
