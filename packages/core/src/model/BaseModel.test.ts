import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseModel, __testSetDbContext } from './BaseModel';
import { DataRepository } from './repository';
import { createModel } from './factory';
import { Kysely } from 'kysely';
import type { FieldModifier } from '../schema/types';

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

// Use the test utility from BaseModel
const setDbContext = __testSetDbContext;

describe('BaseModel and Repository', () => {
  const schema = {
    id: {
      type: 'bigint',
      modifiers: new Set<FieldModifier>(['primary']),
      columnOptions: { mode: 'number' },
    },
    name: { type: 'string', modifiers: new Set<FieldModifier>() },
  } as const;
  const User = createModel({ name: 'User', schema });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws if repository is used without DB context', async () => {
    await expect(User.findById(1)).rejects.toThrow('No database context available');
  });

  it('model static methods delegate to repository and use DB context', async () => {
    await setDbContext(mockDb, async () => {
      const user = await User.findById(1);
      expect(user).toEqual({ id: 1, name: 'Alice' });
      expect(mockDb.selectFrom).toHaveBeenCalledWith('users');
    });
  });

  it('repository serializes data on create', async () => {
    await setDbContext(mockDb, async () => {
      await User.create({ id: 2, name: 'Bob' });
      expect(mockDb.insertInto).toHaveBeenCalledWith('users');
    });
  });

  it('BaseModel.withTransaction uses transaction context', async () => {
    await setDbContext(mockDb, async () => {
      let contextDb: Kysely<any> | undefined;
      await BaseModel.withTransaction(async () => {
        contextDb = BaseModel.getCurrentDb();
      });
      expect(contextDb).toBe(mockDb);
      expect(mockDb.transaction).toHaveBeenCalled();
    });
  });
});
