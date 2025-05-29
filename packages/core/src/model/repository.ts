import { BaseModel } from './BaseModel';
import type { SchemaDefinition } from '../schema/types';
import { serializeRow } from '../schema/fields';
import { makeCacheKey } from '../cache/makeCacheKey';
import { DataLoader } from '../utils/DataLoader';

/**
 * Internal repository for plain objects (DTOs)
 * Handles serialization/deserialization and basic CRUD
 */
export class DataRepository<T extends Record<string, unknown>> {
  private schema: SchemaDefinition;
  private tableName: string;

  constructor(schema: SchemaDefinition, tableName: string) {
    this.schema = schema;
    this.tableName = tableName;
  }

  private getDb() {
    const db = BaseModel.getCurrentDb();
    if (!db)
      throw new Error('No database context available. Did you forget to set the DB instance?');
    return db;
  }

  async find(where?: Partial<T>): Promise<T[]> {
    // Bypass cache and DataLoader if inside a transaction
    if (BaseModel.inTransaction()) {
      const db = this.getDb();
      let query = db.selectFrom(this.tableName).selectAll();
      if (where && Object.keys(where).length > 0) {
        for (const [key, value] of Object.entries(where)) {
          query = query.where(key as any, '=', value);
        }
      }
      return (await query.execute()) as T[];
    }
    // Check cache first
    const cache = BaseModel.getCurrentCache();
    const cacheKey = makeCacheKey(this.tableName, 'find', where || {});
    if (cache && cache.has(cacheKey)) {
      return cache.get<T[]>(cacheKey)!;
    }
    // Use DataLoader for batching outside transactions
    const loaderKey = `${this.tableName}:find:${makeCacheKey(where || {})}`;
    const loader = BaseModel.getDataLoader<Partial<T>, T[]>(
      loaderKey,
      () =>
        new DataLoader<Partial<T>, T[]>(async (wheres) => {
          // All wheres are deeply equal, so just call find once
          const result = await this._findBatch(wheres[0]);
          // Return the same result for all
          return wheres.map(() => result);
        }),
    ) as DataLoader<Partial<T>, T[]>;
    const result = await loader.load(where || {});
    const safeResult = result ?? [];
    if (cache) {
      cache.set(cacheKey, safeResult);
      // Register cache key for each involved id (if id field exists)
      for (const row of safeResult) {
        const id = (row as any)['id'];
        if (id !== undefined) {
          cache.registerKeyForId(this.tableName, id, cacheKey);
        }
      }
    }
    return safeResult;
  }

  // Internal: actual DB query for find batching
  private async _findBatch(where?: Partial<T>): Promise<T[]> {
    const db = this.getDb();
    let query = db.selectFrom(this.tableName).selectAll();
    if (where && Object.keys(where).length > 0) {
      for (const [key, value] of Object.entries(where)) {
        query = query.where(key as any, '=', value);
      }
    }
    return (await query.execute()) as T[];
  }

  async findById(id: unknown, idField: string = 'id'): Promise<T | null> {
    // Bypass cache and DataLoader if inside a transaction
    if (BaseModel.inTransaction()) {
      const db = this.getDb();
      const result = await db
        .selectFrom(this.tableName)
        .selectAll()
        .where(idField as any, '=', id)
        .limit(1)
        .execute();
      return (result[0] as T) ?? null;
    }
    // Check cache first
    const cache = BaseModel.getCurrentCache();
    const cacheKey = makeCacheKey(this.tableName, 'findById', { [idField]: id });
    if (cache && cache.has(cacheKey)) {
      return cache.get<T | null>(cacheKey)!;
    }
    // Use DataLoader for batching outside transactions
    const loaderKey = `${this.tableName}:${idField}`;
    const loader = BaseModel.getDataLoader<unknown, T | null>(
      loaderKey,
      () => new DataLoader<unknown, T | null>((ids) => this.findByIds(ids, idField)),
    ) as DataLoader<unknown, T | null>;
    const value = await loader.load(id);
    if (cache) {
      cache.set(cacheKey, value);
      if (value !== null) {
        cache.registerKeyForId(this.tableName, (value as any)[idField], cacheKey);
      }
    }
    return value;
  }

  /**
   * Fetch multiple records by their IDs in a single query.
   * Returns results in the same order as input, with null for missing records.
   * @param ids - Array of IDs to fetch
   * @param idField - Name of the ID field (default: 'id')
   */
  async findByIds(ids: readonly unknown[], idField: string = 'id'): Promise<(T | null)[]> {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    // Bypass cache if inside a transaction
    if (BaseModel.inTransaction()) {
      const db = this.getDb();
      const result = (await db
        .selectFrom(this.tableName)
        .selectAll()
        .where(idField as any, 'in', ids)
        .execute()) as T[];
      // Map results to input order, null for missing
      const map = new Map<any, T>();
      for (const row of result) {
        map.set((row as any)[idField], row);
      }
      return ids.map((id) => map.get(id) ?? null);
    }
    // No cache for batch by default (can be optimized later)
    const db = this.getDb();
    const result = (await db
      .selectFrom(this.tableName)
      .selectAll()
      .where(idField as any, 'in', ids)
      .execute()) as T[];
    const map = new Map<any, T>();
    for (const row of result) {
      map.set((row as any)[idField], row);
    }
    return ids.map((id) => map.get(id) ?? null);
  }

  /**
   * Insert a row and return the inserted row (fetched by primary key).
   * If inside a transaction, record the write for surgical cache invalidation.
   */
  async create(data: Partial<T>, idField: string = 'id'): Promise<T | null> {
    const db = this.getDb();
    const row = serializeRow(data, this.schema);
    const insertResult = await db.insertInto(this.tableName).values(row).executeTakeFirst();
    // Kysely's insert result: { insertId: ... }
    const insertedId = (insertResult as any)?.insertId ?? (row as any)[idField];
    // Debug logging for test diagnosis
    // eslint-disable-next-line no-console
    console.log('[DEBUG create]', {
      insertResult,
      insertedId,
      insertedIdType: typeof insertedId,
      rowId: (row as any)[idField],
      rowIdType: typeof (row as any)[idField],
      row,
    });
    // Coerce insertedId to number if schema expects number (default bigint mode)
    const idFieldDef = this.schema[idField];
    let lookupId = insertedId;
    if (
      idFieldDef?.type === 'bigint' &&
      (idFieldDef.columnOptions?.mode ?? 'number') === 'number' &&
      typeof insertedId === 'bigint'
    ) {
      lookupId = Number(insertedId);
    }
    if (insertedId != null) {
      BaseModel.recordWrite(this.tableName, String(insertedId));
    }
    if (insertedId == null) return null;
    return this.findById(lookupId, idField);
  }

  /**
   * Updates a row and records the write for surgical cache invalidation.
   */
  async update(id: unknown, data: Partial<T>, idField: string = 'id'): Promise<void> {
    BaseModel.recordWrite(this.tableName, String(id));
    const cache = BaseModel.getCurrentCache();
    if (!BaseModel.inTransaction() && cache) cache.invalidateKeysForId(this.tableName, String(id));
    const db = this.getDb();
    const row = serializeRow(data, this.schema);
    await db
      .updateTable(this.tableName)
      .set(row)
      .where(idField as any, '=', id)
      .execute();
  }

  /**
   * Deletes a row and records the write for surgical cache invalidation.
   */
  async delete(id: unknown, idField: string = 'id'): Promise<void> {
    BaseModel.recordWrite(this.tableName, String(id));
    const cache = BaseModel.getCurrentCache();
    if (!BaseModel.inTransaction() && cache) cache.invalidateKeysForId(this.tableName, String(id));
    const db = this.getDb();
    await db
      .deleteFrom(this.tableName)
      .where(idField as any, '=', id)
      .execute();
  }
}
