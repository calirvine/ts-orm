/**
 * Minimal, type-safe DataLoader for batching and deduplication.
 * Batches loads within a tick, deduplicates, and returns results in order.
 *
 * @template K - Key type
 * @template V - Value type
 *
 * @example
 * const loader = new DataLoader<number, User>(async (ids) => UserRepo.findByIds(ids));
 * const user = await loader.load(1);
 * const users = await loader.loadMany([1, 2, 3]);
 */
export class DataLoader<K, V> {
  private batchFn: (keys: readonly K[]) => Promise<(V | null)[]>;
  private queue = new Map<K, { resolve: (v: V | null) => void; reject: (e: unknown) => void }[]>();
  private scheduled = false;

  constructor(batchFn: (keys: readonly K[]) => Promise<(V | null)[]>) {
    this.batchFn = batchFn;
  }

  /**
   * Load a single key, batched with others in the same tick.
   */
  load(key: K): Promise<V | null> {
    return new Promise((resolve, reject) => {
      if (!this.queue.has(key)) {
        this.queue.set(key, []);
      }
      this.queue.get(key)!.push({ resolve, reject });
      if (!this.scheduled) {
        this.scheduled = true;
        queueMicrotask(() => this.dispatch());
      }
    });
  }

  /**
   * Load multiple keys, batched together.
   */
  loadMany(keys: readonly K[]): Promise<(V | null)[]> {
    return Promise.all(keys.map((k) => this.load(k)));
  }

  private async dispatch() {
    this.scheduled = false;
    const keys = Array.from(this.queue.keys());
    const callbacks = keys.map((k) => this.queue.get(k)!);
    this.queue.clear();
    try {
      const results = await this.batchFn(keys);
      for (let i = 0; i < keys.length; ++i) {
        const value = results[i] ?? null;
        for (const { resolve } of callbacks[i]) {
          resolve(value);
        }
      }
    } catch (err) {
      for (const cbs of callbacks) {
        for (const { reject } of cbs) {
          reject(err);
        }
      }
    }
  }
}
