import { describe, it, expect, vi } from 'vitest';
import { DataLoader } from './DataLoader';

describe('DataLoader', () => {
  it('batches multiple loads in the same tick', async () => {
    const batchFn = vi.fn(async (keys: readonly number[]) => keys.map((k) => k * 2));
    const loader = new DataLoader<number, number>(batchFn);
    const p1 = loader.load(1);
    const p2 = loader.load(2);
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe(2);
    expect(r2).toBe(4);
    expect(batchFn).toHaveBeenCalledTimes(1);
    expect(batchFn).toHaveBeenCalledWith([1, 2]);
  });

  it('deduplicates loads for the same key', async () => {
    const batchFn = vi.fn(async (keys: readonly number[]) => keys.map((k) => k * 10));
    const loader = new DataLoader<number, number>(batchFn);
    const p1 = loader.load(3);
    const p2 = loader.load(3);
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe(30);
    expect(r2).toBe(30);
    expect(batchFn).toHaveBeenCalledTimes(1);
    expect(batchFn).toHaveBeenCalledWith([3]);
  });

  it('returns results in the same order as requested', async () => {
    const batchFn = vi.fn(async (keys: readonly string[]) => keys.map((k) => k + '!'));
    const loader = new DataLoader<string, string>(batchFn);
    const results = await loader.loadMany(['a', 'b', 'c']);
    expect(results).toEqual(['a!', 'b!', 'c!']);
  });

  it('returns null for missing results', async () => {
    const batchFn = vi.fn(async (keys: readonly number[]) => [null, 2, null]);
    const loader = new DataLoader<number, number>(batchFn);
    const results = await loader.loadMany([1, 2, 3]);
    expect(results).toEqual([null, 2, null]);
  });

  it('propagates errors to all pending loads', async () => {
    const batchFn = vi.fn(async () => {
      throw new Error('fail');
    });
    const loader = new DataLoader<number, number>(batchFn);
    const p1 = loader.load(1);
    const p2 = loader.load(2);
    await expect(p1).rejects.toThrow('fail');
    await expect(p2).rejects.toThrow('fail');
  });

  it('handles empty loadMany', async () => {
    const batchFn = vi.fn(async (keys: readonly number[]) => []);
    const loader = new DataLoader<number, number>(batchFn);
    const results = await loader.loadMany([]);
    expect(results).toEqual([]);
    expect(batchFn).not.toHaveBeenCalled();
  });
});
