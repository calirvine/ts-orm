import { createPool } from 'mysql2/promise';
import { Kysely, MysqlDialect } from 'kysely';
import type {
  Pool,
  PoolConnection,
  RowDataPacket,
  FieldPacket,
  SslOptions,
  ResultSetHeader,
} from 'mysql2/promise';
import type { DatabaseAdapter, DatabaseConfig, QueryResult, Transaction } from '@orm/core';
import type { SchemaDefinition, FieldDefinition, FieldType, FieldModifier } from '@orm/core';
import { coerceBigintFieldValue, serializeRow } from '@orm/core';

// Kysely Database interface (to be generated or refined per project)
interface Database {
  // For now, allow any table name, with any shape
  [table: string]: Record<string, any>;
}

interface MySQLColumnInfo extends RowDataPacket {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_key: string;
  extra: string;
}

/**
 * Coerce DB row values according to schema (for deserialization)
 */
function coerceRow(
  row: Record<string, unknown>,
  schema: SchemaDefinition,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key in row) {
    const field = schema[key];
    if (field && field.type === 'bigint') {
      result[key] = coerceBigintFieldValue(row[key], field);
    } else {
      result[key] = row[key];
    }
  }
  return result;
}

/**
 * MySQL implementation of the DatabaseAdapter interface
 */
export class MySQLAdapter implements DatabaseAdapter {
  private pool: any;
  private config: DatabaseConfig;
  private kysely: Kysely<Database>;

  constructor(config: DatabaseConfig) {
    this.config = config;
    // Only include ssl if it's a string or SslOptions
    const poolConfig: any = {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      waitForConnections: true,
      connectionLimit: config.pool?.max ?? 10,
      queueLimit: 0,
    };
    if (config.ssl && typeof config.ssl !== 'boolean') {
      poolConfig.ssl = config.ssl;
    }
    this.pool = createPool(poolConfig);
    this.kysely = new Kysely<Database>({
      dialect: new MysqlDialect({ pool: this.pool }),
    });
  }

  async connect(): Promise<void> {
    await this.pool.getConnection();
  }

  async disconnect(): Promise<void> {
    await this.pool.end();
    await this.kysely.destroy();
  }

  // Generic find (select) using Kysely
  async find<T extends Record<string, any>>(
    table: string,
    schema: SchemaDefinition,
    where?: Partial<T>,
  ): Promise<T[]> {
    let query = this.kysely.selectFrom(table).selectAll();
    if (where && Object.keys(where).length > 0) {
      for (const [key, value] of Object.entries(where)) {
        query = query.where(key as any, '=', value);
      }
    }
    const result = await query.execute();
    // Deserialize custom types
    return result.map((row) => this.deserializeRow(row, schema)) as T[];
  }

  async findById<T extends Record<string, any>>(
    table: string,
    schema: SchemaDefinition,
    id: unknown,
    idField: string = 'id',
  ): Promise<T | null> {
    const result = await this.kysely
      .selectFrom(table)
      .selectAll()
      .where(idField as any, '=', id)
      .limit(1)
      .execute();
    return result.length > 0 ? (this.deserializeRow(result[0], schema) as T) : null;
  }

  async create<T extends Record<string, any>>(
    table: string,
    schema: SchemaDefinition,
    data: Partial<T>,
  ): Promise<T> {
    const row = serializeRow(data, schema);
    await this.kysely.insertInto(table).values(row).execute();
    // Optionally: fetch the inserted row (if you want auto-increment id, etc.)
    return row as T;
  }

  async update<T extends Record<string, any>>(
    table: string,
    schema: SchemaDefinition,
    id: unknown,
    data: Partial<T>,
    idField: string = 'id',
  ): Promise<void> {
    const row = serializeRow(data, schema);
    await this.kysely
      .updateTable(table)
      .set(row)
      .where(idField as any, '=', id)
      .execute();
  }

  async delete(table: string, id: unknown, idField: string = 'id'): Promise<void> {
    await this.kysely
      .deleteFrom(table)
      .where(idField as any, '=', id)
      .execute();
  }

  // Utility: deserialize a row using schema (for custom types like bigint)
  private deserializeRow(
    row: Record<string, unknown>,
    schema: SchemaDefinition,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const key in row) {
      const field = schema[key];
      if (field && field.type === 'bigint') {
        result[key] = coerceBigintFieldValue(row[key], field);
      } else {
        result[key] = row[key];
      }
    }
    return result;
  }

  // The following methods are required by the DatabaseAdapter interface but are not yet implemented with Kysely:
  async createTable(tableName: string, schema: SchemaDefinition): Promise<void> {
    throw new Error('createTable not implemented with Kysely yet');
  }
  async dropTable(tableName: string): Promise<void> {
    throw new Error('dropTable not implemented with Kysely yet');
  }
  async tableExists(tableName: string): Promise<boolean> {
    throw new Error('tableExists not implemented with Kysely yet');
  }
  async query<T = unknown>(
    sql: string,
    params?: unknown[],
    schema?: SchemaDefinition,
  ): Promise<QueryResult<T>> {
    throw new Error(
      'Raw query not implemented with Kysely. Use find/create/update/delete methods.',
    );
  }
  async beginTransaction(): Promise<Transaction> {
    throw new Error('Transactions not implemented with Kysely yet');
  }
  getDatabaseType(): string {
    return 'mysql';
  }
  async getDatabaseVersion(): Promise<string> {
    throw new Error('getDatabaseVersion not implemented with Kysely yet');
  }
  async getTables(): Promise<string[]> {
    throw new Error('getTables not implemented with Kysely yet');
  }
  async getTableSchema(tableName: string): Promise<SchemaDefinition> {
    throw new Error('getTableSchema not implemented with Kysely yet');
  }
}
