import { Kysely, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import type { DatabaseAdapter, QueryResult, Transaction } from '@orm/core';
import type { SchemaDefinition } from '@orm/core';

/**
 * SQLite adapter configuration
 */
export interface SqliteConfig {
  /**
   * The SQLite database file path, or ':memory:' for in-memory
   */
  database: string;
}

export class SqliteAdapter implements DatabaseAdapter<SqliteConfig> {
  private db: Kysely<any>;

  constructor(config: SqliteConfig) {
    this.db = new Kysely({
      dialect: new SqliteDialect({
        database: new Database(config.database || ':memory:'),
      }),
    });
  }

  getQueryEngine() {
    // Kysely implements the required OrmQueryEngine interface
    return this.db as unknown as import('@orm/core').OrmQueryEngine;
  }

  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {
    await this.db.destroy();
  }

  async query<T = unknown>(
    sql: string,
    params?: unknown[],
    schema?: SchemaDefinition,
  ): Promise<QueryResult<T>> {
    throw new Error(
      'Raw SQL queries are not supported in the SQLite adapter. Use the repository/model API.',
    );
  }

  // Stubs for required interface methods
  async createTable(tableName: string, schema: SchemaDefinition): Promise<void> {
    throw new Error('Not implemented');
  }
  async dropTable(tableName: string): Promise<void> {
    throw new Error('Not implemented');
  }
  async tableExists(tableName: string): Promise<boolean> {
    throw new Error('Not implemented');
  }
  async beginTransaction(): Promise<Transaction> {
    throw new Error('Not implemented');
  }
  getDatabaseType(): string {
    return 'sqlite';
  }
  async getDatabaseVersion(): Promise<string> {
    throw new Error('Not implemented');
  }
  async getTables(): Promise<string[]> {
    throw new Error('Not implemented');
  }
  async getTableSchema(tableName: string): Promise<SchemaDefinition> {
    throw new Error('Not implemented');
  }
}
