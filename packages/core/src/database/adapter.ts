import { SchemaDefinition } from '../schema/types';

/**
 * Internal abstraction for query/transaction engine used by the ORM context.
 * Not part of the public API.
 */
export interface OrmQueryEngine {
  // Minimal set of methods needed by the ORM
  selectFrom: (...args: any[]) => any;
  insertInto: (...args: any[]) => any;
  updateTable: (...args: any[]) => any;
  deleteFrom: (...args: any[]) => any;
  transaction: (...args: any[]) => any;
  // Add more as needed for ORM features
}

/**
 * Query result interface
 */
export interface QueryResult<T = unknown> {
  rows: T[];
  rowCount: number;
  fields?: { name: string; type: string }[];
}

/**
 * Transaction interface
 */
export interface Transaction {
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

/**
 * Core database adapter interface
 * @template Config - The configuration type for the adapter
 */
export interface DatabaseAdapter<Config = unknown> {
  /**
   * Connect to the database
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the database
   */
  disconnect(): Promise<void>;

  /**
   * Create a new table from a schema definition
   */
  createTable(tableName: string, schema: SchemaDefinition): Promise<void>;

  /**
   * Drop a table
   */
  dropTable(tableName: string): Promise<void>;

  /**
   * Check if a table exists
   */
  tableExists(tableName: string): Promise<boolean>;

  /**
   * Execute a raw SQL query
   */
  query<T = unknown>(
    sql: string,
    params?: unknown[],
    schema?: SchemaDefinition,
  ): Promise<QueryResult<T>>;

  /**
   * Begin a new transaction
   */
  beginTransaction(): Promise<Transaction>;

  /**
   * Get the database type (e.g., 'mysql', 'postgres', 'sqlite')
   */
  getDatabaseType(): string;

  /**
   * Get the database version
   */
  getDatabaseVersion(): Promise<string>;

  /**
   * Get the list of tables in the database
   */
  getTables(): Promise<string[]>;

  /**
   * Get the schema for a table
   */
  getTableSchema(tableName: string): Promise<SchemaDefinition>;

  /**
   * Returns the internal query engine for use by the ORM context.
   * Not part of the public API.
   */
  getQueryEngine(): OrmQueryEngine;
}
