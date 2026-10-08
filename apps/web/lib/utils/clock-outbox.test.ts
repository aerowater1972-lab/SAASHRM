import { describe, it, expect, vi } from 'vitest';
import {
  enqueueClock,
  flushOutbox,
  pendingCount,
  isNetworkError,
  OfflineQueuedError,
  type ClockStore,
  type ClockOutboxEntry,
} from './clock-outbox';
import { prefetchFaceModels } from './face-embedding';

function memoryStore(seed: ClockOutboxEntry[] = []): ClockStore {
  const map = new Map(seed.map((e) => [e.id, { ...e }]));
  return {
    add: async (e) => {
      map.set(e.id, { ...e });
    },
    list: async () => [...map.values()],
    remove: async (id) => {
      map.delete(id);
    },
    update: async (id, patch) => {
      const cur = map.get(id);
      if (cur) map.set(id, { ...cur, ...patch });
    },
  };
}

const entry = (over: Partial<ClockOutboxEntry> = {}): ClockOutboxEntry => ({
  id: over.id ?? Math.random().toString(36).slice(2),
  kind: 'clock-in',
  payload: { method: 'GPS' },
  tenantId: 'default',
  createdAt: new Date().toISOString(),
  attempts: 0,
  ...over,
});

describe('clock outbox', () => {
  it('enqueues and flushes FIFO, removing sent entries', async () => {
    const store = memoryStore();
    await enqueueClock(store, 'clock-in', { a: 1 }, 'default');
    await enqueueClock(store, 'clock-out', { b: 2 }, 'default');
    expect(await pendingCount(store)).toBe(2);

    const seen: string[] = [];
    const res = await flushOutbox(store, async (kind) => {
      seen.push(kind);
    });
    expect(res).toEqual({ sent: 2, dropped: 0, remaining: 0 });
    expect(seen).toEqual(['clock-in', 'clock-out']);
  });

  it('stops on first failure and bumps attempts', async () => {
    const store = memoryStore([entry({ id: 'e1' }), entry({ id: 'e2' })]);
    const post = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue({});
    const res = await flushOutbox(store, post);
    expect(res.sent).toBe(0);
    expect(res.remaining).toBe(2);
    expect(post).toHaveBeenCalledTimes(1);
    expect((await store.list()).find((e) => e.id === 'e1')?.attempts).toBe(1);
  });

  it('drops stale (>24h) and exhausted (>=10 attempts) entries', async () => {
    const old = new Date(Date.now() - 25 * 3600_000).toISOString();
    const store = memoryStore([
      entry({ id: 'old', createdAt: old }),
      entry({ id: 'tired', attempts: 10 }),
      entry({ id: 'fresh' }),
    ]);
    const post = vi.fn().mockResolvedValue({});
    const res = await flushOutbox(store, post);
    expect(res).toEqual({ sent: 1, dropped: 2, remaining: 0 });
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('OfflineQueuedError carries the entry id', () => {
    const err = new OfflineQueuedError('abc');
    expect(err).toBeInstanceOf(Error);
    expect(err.entryId).toBe('abc');
    expect(err.message).toMatch(/offline/i);
  });
});

describe('isNetworkError', () => {
  it('treats TypeError and fetch failures as network errors', () => {
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isNetworkError(new Error('Network request failed'))).toBe(true);
    expect(isNetworkError(new Error('Request failed: 500'))).toBe(false);
  });
});

describe('prefetchFaceModels', () => {
  it('resolves true with mocked models', async () => {
    await expect(prefetchFaceModels()).resolves.toBe(true);
  });
});
