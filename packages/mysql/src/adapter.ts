import { createPool } from 'mysql2/promise';
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

interface MySQLColumnInfo extends RowDataPacket {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_key: string;
  extra: string;
}

/**
 * MySQL implementation of the DatabaseAdapter interface
 */
export class MySQLAdapter implements DatabaseAdapter {
  private pool: Pool;
  private config: DatabaseConfig;

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
  }

  async connect(): Promise<void> {
    await this.pool.getConnection();
  }

  async disconnect(): Promise<void> {
    await this.pool.end();
  }

  async createTable(tableName: string, schema: SchemaDefinition): Promise<void> {
    const columns = Object.entries(schema).map(([name, field]: [string, FieldDefinition]) => {
      const type = this.getMySQLType(field.type);
      const modifiers = Array.from(field.modifiers);
      const constraints = [];

      if (modifiers.includes('primary')) {
        constraints.push('PRIMARY KEY');
      }
      if (modifiers.includes('unique')) {
        constraints.push('UNIQUE');
      }
      if (!modifiers.includes('nullable')) {
        constraints.push('NOT NULL');
      }

      return `${this.quoteIdentifier(name)} ${type} ${constraints.join(' ')}`;
    });

    const sql = `CREATE TABLE ${this.quoteIdentifier(tableName)} (${columns.join(', ')})`;
    await this.query(sql);
  }

  async dropTable(tableName: string): Promise<void> {
    await this.query(`DROP TABLE IF EXISTS ${this.quoteIdentifier(tableName)}`);
  }

  async tableExists(tableName: string): Promise<boolean> {
    const result = await this.query<RowDataPacket>(
      'SELECT 1 FROM information_schema.tables WHERE table_schema = ? AND table_name = ?',
      [this.config.database, tableName],
    );
    return result.rows.length > 0;
  }

  /**
   * Execute a SQL query and return the results
   * @template T The type of the rows returned by the query
   * @param sql The SQL query to execute
   * @param params The parameters for the query
   * @returns A QueryResult containing the rows and metadata
   */
  async query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    const [rows, fields] = await this.pool.execute(sql, params);

    // mysql2 returns rows as T[][] for SELECT queries and ResultSetHeader for other queries
    const resultRows = Array.isArray(rows) ? (rows[0] as T[]) : [];

    return {
      rows: resultRows,
      rowCount: resultRows.length,
      fields: fields?.map((f: FieldPacket) => ({ name: f.name, type: String(f.type) })),
    };
  }

  async beginTransaction(): Promise<Transaction> {
    const connection = await this.pool.getConnection();
    await connection.beginTransaction();

    return {
      commit: async () => {
        await connection.commit();
        connection.release();
      },
      rollback: async () => {
        await connection.rollback();
        connection.release();
      },
    };
  }

  getDatabaseType(): string {
    return 'mysql';
  }

  async getDatabaseVersion(): Promise<string> {
    const result = await this.query<RowDataPacket>('SELECT VERSION() as version');
    return result.rows[0].version;
  }

  async getTables(): Promise<string[]> {
    const result = await this.query<RowDataPacket>(
      'SELECT table_name FROM information_schema.tables WHERE table_schema = ?',
      [this.config.database],
    );
    return result.rows.map((row) => row.table_name);
  }

  async getTableSchema(tableName: string): Promise<SchemaDefinition> {
    const result = await this.query<MySQLColumnInfo>(
      `SELECT column_name, data_type, is_nullable, column_key, extra
       FROM information_schema.columns
       WHERE table_schema = ? AND table_name = ?`,
      [this.config.database, tableName],
    );

    const schema: SchemaDefinition = {};
    for (const row of result.rows) {
      const type = this.getFieldType(row.data_type);
      const modifiers = new Set<FieldModifier>();
      if (row.is_nullable !== 'NO') modifiers.add('nullable');
      if (row.column_key === 'PRI') modifiers.add('primary');
      if (row.column_key === 'UNI') modifiers.add('unique');
      schema[row.column_name] = {
        type: type as FieldType,
        modifiers,
      };
    }

    return schema;
  }

  private getMySQLType(fieldType: string): string {
    switch (fieldType) {
      case 'string':
        return 'VARCHAR(255)';
      case 'integer':
        return 'INT';
      case 'bigint':
        return 'BIGINT';
      case 'float':
        return 'FLOAT';
      case 'decimal':
        return 'DECIMAL(10,2)';
      case 'boolean':
        return 'BOOLEAN';
      case 'timestamp':
        return 'TIMESTAMP';
      case 'date':
        return 'DATE';
      case 'time':
        return 'TIME';
      case 'json':
        return 'JSON';
      default:
        throw new Error(`Unsupported field type: ${fieldType}`);
    }
  }

  private getFieldType(mysqlType: string): FieldType {
    const type = mysqlType.toLowerCase();
    if (type.includes('varchar') || type.includes('char') || type.includes('text')) {
      return 'string';
    }
    if (type === 'int') {
      return 'integer';
    }
    if (type === 'bigint') {
      return 'bigint';
    }
    if (type === 'float' || type === 'double') {
      return 'float';
    }
    if (type === 'decimal') {
      return 'decimal';
    }
    if (type === 'boolean' || type === 'tinyint(1)') {
      return 'boolean';
    }
    if (type === 'timestamp' || type === 'datetime') {
      return 'timestamp';
    }
    if (type === 'date') {
      return 'date';
    }
    if (type === 'time') {
      return 'time';
    }
    if (type === 'json') {
      return 'json';
    }
    throw new Error(`Unsupported MySQL type: ${mysqlType}`);
  }

  private quoteIdentifier(name: string): string {
    return `\`${name.replace(/`/g, '``')}\``;
  }
}
