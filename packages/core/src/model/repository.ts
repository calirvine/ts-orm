import { BaseModel } from './BaseModel';
import type { SchemaDefinition } from '../schema/types';
import { serializeRow } from '../schema/fields';

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
    const db = this.getDb();
    let query = db.selectFrom(this.tableName).selectAll();
    if (where && Object.keys(where).length > 0) {
      for (const [key, value] of Object.entries(where)) {
        query = query.where(key as any, '=', value);
      }
    }
    const result = await query.execute();
    // Deserialization is handled by the adapter or can be added here if needed
    return result as T[];
  }

  async findById(id: unknown, idField: string = 'id'): Promise<T | null> {
    const db = this.getDb();
    const result = await db
      .selectFrom(this.tableName)
      .selectAll()
      .where(idField as any, '=', id)
      .limit(1)
      .execute();
    return (result[0] as T) ?? null;
  }

  /**
   * Insert a row and return the inserted row (fetched by primary key).
   */
  async create(data: Partial<T>, idField: string = 'id'): Promise<T | null> {
    const db = this.getDb();
    const row = serializeRow(data, this.schema);
    const insertResult = await db.insertInto(this.tableName).values(row).executeTakeFirst();
    // Kysely's insert result: { insertId: ... }
    const insertedId = (insertResult as any)?.insertId ?? (row as any)[idField];
    if (insertedId == null) return null;
    return this.findById(insertedId, idField);
  }

  async update(id: unknown, data: Partial<T>, idField: string = 'id'): Promise<void> {
    const db = this.getDb();
    const row = serializeRow(data, this.schema);
    await db
      .updateTable(this.tableName)
      .set(row)
      .where(idField as any, '=', id)
      .execute();
  }

  async delete(id: unknown, idField: string = 'id'): Promise<void> {
    const db = this.getDb();
    await db
      .deleteFrom(this.tableName)
      .where(idField as any, '=', id)
      .execute();
  }
}
