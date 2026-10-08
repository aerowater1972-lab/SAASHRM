/**
 * Offline outbox for clock in/out (IndexedDB).
 *
 * When the device is offline, clock payloads are persisted locally and
 * flushed in FIFO order once connectivity returns (online event, app boot,
 * or Background Sync message from the service worker).
 *
 * Storage is adapter-injected so the queue logic is unit-testable without
 * IndexedDB (see InMemoryClockStore in tests).
 */

export type ClockKind = 'clock-in' | 'clock-out';

export interface ClockOutboxEntry {
  id: string;
  kind: ClockKind;
  payload: Record<string, unknown>;
  tenantId: string;
  createdAt: string;
  attempts: number;
}

export interface ClockStore {
  add(entry: ClockOutboxEntry): Promise<void>;
  list(): Promise<ClockOutboxEntry[]>;
  remove(id: string): Promise<void>;
  update(id: string, patch: Partial<ClockOutboxEntry>): Promise<void>;
}

export class OfflineQueuedError extends Error {
  constructor(public readonly entryId: string) {
    super('Tersimpan offline — akan dikirim otomatis saat online.');
    this.name = 'OfflineQueuedError';
  }
}

const DB_NAME = 'flexy-outbox';
const STORE = 'clock';
const MAX_ATTEMPTS = 10;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB unavailable'));
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('IndexedDB op failed'));
        t.oncomplete = () => db.close();
      }),
  );
}

export class IndexedDbClockStore implements ClockStore {
  async add(entry: ClockOutboxEntry): Promise<void> {
    await tx('readwrite', (s) => s.put(entry));
  }
  async list(): Promise<ClockOutboxEntry[]> {
    return tx('readonly', (s) => s.getAll());
  }
  async remove(id: string): Promise<void> {
    await tx('readwrite', (s) => s.delete(id));
  }
  async update(id: string, patch: Partial<ClockOutboxEntry>): Promise<void> {
    const cur = await tx('readonly', (s) => s.get(id));
    if (cur) await tx('readwrite', (s) => s.put({ ...cur, ...patch }));
  }
}

export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine !== false;
}

export function isNetworkError(err: unknown): boolean {
  if (!isOnline()) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return (
    err instanceof TypeError ||
    /failed to fetch|networkerror|network request failed|load failed|offline/i.test(msg)
  );
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

export async function enqueueClock(
  store: ClockStore,
  kind: ClockKind,
  payload: Record<string, unknown>,
  tenantId: string,
): Promise<ClockOutboxEntry> {
  const entry: ClockOutboxEntry = {
    id: newId(),
    kind,
    payload,
    tenantId,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  await store.add(entry);
  return entry;
}

/**
 * Flush pending entries oldest-first. Returns counts. Entries older than
 * 24h or exceeding MAX_ATTEMPTS are dropped (server will reject stale
 * timestamps anyway; HR corrects via attendance correction flow).
 */
export async function flushOutbox(
  store: ClockStore,
  post: (kind: ClockKind, payload: Record<string, unknown>) => Promise<unknown>,
  nowMs = Date.now(),
): Promise<{ sent: number; dropped: number; remaining: number }> {
  const entries = (await store.list()).sort((a, b) =>
    a.createdAt < b.createdAt ? -1 : 1,
  );
  let sent = 0;
  let dropped = 0;
  for (const e of entries) {
    const age = nowMs - new Date(e.createdAt).getTime();
    if (age > MAX_AGE_MS || e.attempts >= MAX_ATTEMPTS) {
      await store.remove(e.id);
      dropped += 1;
      continue;
    }
    try {
      await post(e.kind, e.payload);
      await store.remove(e.id);
      sent += 1;
    } catch {
      await store.update(e.id, { attempts: e.attempts + 1 });
      break; // stop on first failure — likely still offline; retry later
    }
  }
  const remaining = (await store.list()).length;
  return { sent, dropped, remaining };
}

export async function pendingCount(store: ClockStore): Promise<number> {
  return (await store.list()).length;
}
