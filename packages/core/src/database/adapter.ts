import { SchemaDefinition } from '../schema/types';

/**
 * Database connection configuration
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  pool?: {
    min?: number;
    max?: number;
    idleTimeoutMillis?: number;
  };
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
 */
export interface DatabaseAdapter {
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
  query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;

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
}
