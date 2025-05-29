import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseModel } from './BaseModel';
import { DataRepository } from './repository';
import { Kysely } from 'kysely';
import { bigint, string } from '../schema/fields';
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
} as any;

describe('DataRepository request-level cache', () => {
  // Use field factories to create a valid schema
  const schema = {
    id: bigint().notNull().primary().build(),
    name: string().notNull().build(),
  };
  const repo = new DataRepository(schema, 'users');

  beforeEach(() => {
    vi.clearAllMocks();
    // Always reset mockDb.execute to a new mock for each test
    mockDb.execute = vi.fn().mockResolvedValue([{ id: 1, name: 'Alice' }]);
  });

  it('caches findById within a request', async () => {
    const orm = createORMContext({ db: mockDb });
    await orm.run(async () => {
      // First call: cache miss
      const user1 = await repo.findById(1);
      expect(user1).toEqual({ id: 1, name: 'Alice' });
      // Second call: cache hit (should not call DB again)
      mockDb.execute.mockResolvedValueOnce([]); // would fail if called
      const user2 = await repo.findById(1);
      expect(user2).toEqual({ id: 1, name: 'Alice' });
    });
  });

  it('invalidates cache on update (non-transactional)', async () => {
    const orm = createORMContext({ db: mockDb });
    await orm.run(async () => {
      await repo.findById(1); // cache
      await repo.update(1, { name: 'Bob' }); // should invalidate
      mockDb.execute = vi.fn().mockResolvedValueOnce([{ id: 1, name: 'Bob' }]);
      const user = await repo.findById(1); // should hit DB again
      expect(user).toEqual({ id: 1, name: 'Bob' });
    });
  });

  it('bypasses cache and surgically invalidates on transaction commit', async () => {
    const orm = createORMContext({ db: mockDb });
    await orm.run(async () => {
      await repo.findById(1); // cache
      await BaseModel.withTransaction(async () => {
        // Should bypass cache
        mockDb.execute.mockResolvedValueOnce([{ id: 1, name: 'Alice (tx)' }]);
        const userTx = await repo.findById(1);
        expect(userTx).toEqual({ id: 1, name: 'Alice (tx)' });
        // Update in transaction
        await repo.update(1, { name: 'Alice (tx2)' });
        // After update, still bypass cache
        mockDb.execute.mockResolvedValueOnce([{ id: 1, name: 'Alice (tx2)' }]);
        const userTx2 = await repo.findById(1);
        expect(userTx2).toEqual({ id: 1, name: 'Alice (tx2)' });
      });
      // After commit, cache should be invalidated
      mockDb.execute.mockResolvedValueOnce([{ id: 1, name: 'Alice (tx2)' }]);
      const user = await repo.findById(1);
      expect(user).toEqual({ id: 1, name: 'Alice (tx2)' });
    });
  });

  it('findByIds returns results in input order and null for missing', async () => {
    const orm = createORMContext({ db: mockDb });
    await orm.run(async () => {
      mockDb.execute = vi.fn().mockResolvedValueOnce([
        { id: 1, name: 'Alice' },
        { id: 3, name: 'Carol' },
      ]);
      const results = await repo.findByIds([3, 2, 1]);
      expect(results).toEqual([{ id: 3, name: 'Carol' }, null, { id: 1, name: 'Alice' }]);
    });
  });

  it('findByIds works inside a transaction', async () => {
    const orm = createORMContext({ db: mockDb });
    await orm.run(async () => {
      mockDb.execute = vi.fn().mockResolvedValueOnce([{ id: 2, name: 'Bob' }]);
      await BaseModel.withTransaction(async () => {
        const results = await repo.findByIds([2, 4]);
        expect(results).toEqual([{ id: 2, name: 'Bob' }, null]);
      });
    });
  });

  it('batches multiple findById calls in the same tick using DataLoader', async () => {
    const orm = createORMContext({ db: mockDb });
    await orm.run(async () => {
      const repo2 = new DataRepository(schema, 'users');
      const spy = vi.spyOn(repo2, 'findByIds');
      // Simulate two findById calls in the same tick
      const p1 = repo2.findById(1);
      const p2 = repo2.findById(2);
      mockDb.execute = vi.fn().mockResolvedValueOnce([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1).toEqual({ id: 1, name: 'Alice' });
      expect(r2).toEqual({ id: 2, name: 'Bob' });
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith([1, 2], 'id');
    });
  });

  it('deduplicates findById calls for the same id in the same tick', async () => {
    const orm = createORMContext({ db: mockDb });
    await orm.run(async () => {
      const repo2 = new DataRepository(schema, 'users');
      const spy = vi.spyOn(repo2, 'findByIds');
      const p1 = repo2.findById(1);
      const p2 = repo2.findById(1);
      mockDb.execute = vi.fn().mockResolvedValueOnce([{ id: 1, name: 'Alice' }]);
      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1).toEqual({ id: 1, name: 'Alice' });
      expect(r2).toEqual({ id: 1, name: 'Alice' });
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith([1], 'id');
    });
  });

  it('batches multiple find(where) calls with same params in the same tick', async () => {
    const orm = createORMContext({ db: mockDb });
    await orm.run(async () => {
      const repo2 = new DataRepository(schema, 'users');
      const spy = vi.spyOn(repo2 as any, '_findBatch');
      const where = { name: 'Alice' };
      // Simulate two find(where) calls in the same tick
      const p1 = repo2.find(where);
      const p2 = repo2.find(where);
      mockDb.execute = vi.fn().mockResolvedValueOnce([{ id: 1, name: 'Alice' }]);
      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1).toEqual([{ id: 1, name: 'Alice' }]);
      expect(r2).toEqual([{ id: 1, name: 'Alice' }]);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(where);
    });
  });

  it('does not batch find(where) calls with different params', async () => {
    const orm = createORMContext({ db: mockDb });
    await orm.run(async () => {
      const repo2 = new DataRepository(schema, 'users');
      const spy = vi.spyOn(repo2 as any, '_findBatch');
      const where1 = { name: 'Alice' };
      const where2 = { name: 'Bob' };
      mockDb.execute = vi
        .fn()
        .mockResolvedValueOnce([{ id: 1, name: 'Alice' }])
        .mockResolvedValueOnce([{ id: 2, name: 'Bob' }]);
      const [r1, r2] = await Promise.all([repo2.find(where1), repo2.find(where2)]);
      expect(r1).toEqual([{ id: 1, name: 'Alice' }]);
      expect(r2).toEqual([{ id: 2, name: 'Bob' }]);
      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenCalledWith(where1);
      expect(spy).toHaveBeenCalledWith(where2);
    });
  });

  it('deduplicates repeated find(where) calls with same params', async () => {
    const orm = createORMContext({ db: mockDb });
    await orm.run(async () => {
      const repo2 = new DataRepository(schema, 'users');
      const spy = vi.spyOn(repo2 as any, '_findBatch');
      const where = { name: 'Alice' };
      mockDb.execute = vi.fn().mockResolvedValueOnce([{ id: 1, name: 'Alice' }]);
      const [r1, r2, r3] = await Promise.all([
        repo2.find(where),
        repo2.find(where),
        repo2.find(where),
      ]);
      expect(r1).toEqual([{ id: 1, name: 'Alice' }]);
      expect(r2).toEqual([{ id: 1, name: 'Alice' }]);
      expect(r3).toEqual([{ id: 1, name: 'Alice' }]);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(where);
    });
  });
});
