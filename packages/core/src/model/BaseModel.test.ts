import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseModel } from './BaseModel';
import { createModel } from './factory';
import { Kysely } from 'kysely';
import type { FieldModifier } from '../schema/types';
import { bigint, defineSchema, InferAttrsFromSchema, string } from '../schema';
import { createORMContext } from '../context';

// Mock Kysely instance
const mockDb = {
  selectFrom: vi.fn().mockReturnThis(),
  selectAll: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  execute: vi.fn().mockResolvedValue([{ id: 1, name: 'Alice' }]),
  insertInto: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  executeTakeFirst: vi.fn().mockResolvedValue({ insertId: 1 }),
  updateTable: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  deleteFrom: vi.fn().mockReturnThis(),
  transaction: vi.fn().mockReturnValue({
    execute: vi.fn().mockImplementation(async (cb) => cb(mockDb)),
  }),
} as unknown as Kysely<any>;

describe('BaseModel and Repository', () => {
  const schema = defineSchema({
    id: bigint().notNull().primary().build(),
    name: string().notNull().build(),
  });

  class User extends createModel<InferAttrsFromSchema<typeof schema>>({
    name: 'User',
    schema,
  }) {}

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws if repository is used without DB context', async () => {
    await expect(User.findById(1)).rejects.toThrow(
      'No ORM context found. Did you forget to wrap your code in orm.run?',
    );
  });

  it('model static methods delegate to repository and use DB context', async () => {
    const orm = createORMContext({ db: mockDb });
    await orm.run(async () => {
      const user = await User.findById(1);
      expect(user?.getAttributes()).toEqual({ id: 1, name: 'Alice' });
      expect(mockDb.selectFrom).toHaveBeenCalledWith('users');
    });
  });

  it('repository serializes data on create', async () => {
    const orm = createORMContext({ db: mockDb });
    await orm.run(async () => {
      await User.create({ id: 2, name: 'Bob' });
      expect(mockDb.insertInto).toHaveBeenCalledWith('users');
    });
  });

  it('BaseModel.withTransaction uses transaction context', async () => {
    const orm = createORMContext({ db: mockDb });
    await orm.run(async () => {
      let contextDb: Kysely<any> | undefined;
      await BaseModel.withTransaction(async () => {
        contextDb = BaseModel.getCurrentDb();
      });
      expect(contextDb).toBe(mockDb);
      expect(mockDb.transaction).toHaveBeenCalled();
    });
  });
});
