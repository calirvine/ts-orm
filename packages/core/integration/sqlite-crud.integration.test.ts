import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createORMContext } from '../src/context';
import { SqliteAdapter, SqliteConfig } from '../../sqlite/src/adapter';
import { defineSchema, InferAttrsFromSchema } from '../src/schema/schema';
import { string, bigint } from '../src/schema/fields';
import { createModel } from '../src/model/factory';

/**
 * Integration test for ORM using in-memory SQLite.
 * Verifies basic CRUD operations through the public API.
 */
describe('ORM Integration: SQLite (in-memory)', () => {
  let orm: ReturnType<typeof createORMContext>;
  let adapter: SqliteAdapter;

  // Define schema and model
  const userSchema = defineSchema({
    id: bigint().notNull().primary().build(),
    name: string().notNull().build(),
    email: string().notNull().build(),
  });
  class User extends createModel<InferAttrsFromSchema<typeof userSchema>>({
    name: 'User',
    schema: userSchema,
  }) {}

  beforeEach(async () => {
    // Set up a new context with a fresh in-memory SQLite adapter for each test
    const config: SqliteConfig = { database: ':memory:' };
    adapter = new SqliteAdapter(config);
    orm = createORMContext({ db: adapter.getQueryEngine() });
    // --- MIGRATION HACK: create the table manually ---
    // This should be replaced with a real migration system or adapter.createTable
    const db = (adapter as any).db;
    await db.schema
      .createTable('users')
      .addColumn('id', 'integer', (col: any) => col.primaryKey().notNull())
      .addColumn('name', 'text', (col: any) => col.notNull())
      .addColumn('email', 'text', (col: any) => col.notNull())
      .execute();
  });

  afterEach(async () => {
    // Clean up adapter if needed
    await adapter.disconnect();
  });

  it('should create, read, update, and delete a user', async () => {
    await orm.run(async () => {
      // CREATE
      const created = await User.create({ id: 1, name: 'Alice', email: 'alice@example.com' });
      expect(created).toBeTruthy();
      expect(created?.name).toBe('Alice');
      expect(created?.email).toBe('alice@example.com');

      // READ
      const found = await User.findById(1);
      expect(found).toBeTruthy();
      expect(found?.name).toBe('Alice');
      expect(found?.email).toBe('alice@example.com');

      // UPDATE
      await User.update(1, { name: 'Alicia' });
      const updated = await User.findById(1);
      expect(updated?.name).toBe('Alicia');

      // DELETE
      await User.delete(1);
      const deleted = await User.findById(1);
      expect(deleted).toBeNull();
    });
  });
});
