import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { enqueue, coalesceEntries, removeByTableAndRecord, drainOutbox } from '../lib/sync-engine';
import { getOutboxEntries, addToOutbox } from '../lib/offline-db';

function makeSupabaseMock(handler) {
  const from = vi.fn(() => {
    const q = {};
    q.insert = vi.fn(data => { q._op = 'insert'; q._data = data; return q; });
    q.update = vi.fn(data => { q._op = 'update'; q._data = data; return q; });
    q.delete = vi.fn(() => { q._op = 'delete'; return q; });
    q.eq = vi.fn((col, id) => { q._id = id; return q; });
    q.select = vi.fn(() => q);
    q.single = vi.fn(() => handler({ op: q._op, data: q._data, id: q._id }));
    return q;
  });
  return { from };
}

const okResult = { error: null, data: { id: 'server-1' } };
const authError = { status: 401, message: 'unauthorized' };
const conflictError = { status: 409, message: 'conflict', serverRecord: { id: 'x' } };
const genericError = { status: 500, message: 'boom' };

function makeErrorResponse(err) { throw err; }

async function resetOutbox() {
  const { getDB } = await import('../lib/offline-db');
  const db = await getDB();
  await db.clear('outbox');
}

describe('drainOutbox', () => {
  beforeEach(resetOutbox);
  afterEach(() => { vi.restoreAllMocks(); });

  it('replays a pending insert with idempotency key and dequeues it', async () => {
    const supabase = makeSupabaseMock(() => okResult);
    await enqueue({ table: 'students', operation: 'insert', data: { name: 'Ali' }, recordId: 'c1', baseVersion: 'v1' });
    await drainOutbox(supabase);
    expect(await getOutboxEntries()).toHaveLength(0);
    const q = supabase.from.mock.results[0].value;
    expect(q.insert).toHaveBeenCalledWith(expect.objectContaining({ name: 'Ali', client_request_id: expect.any(String) }));
  });

  it('replays an update with the record id', async () => {
    const supabase = makeSupabaseMock(() => okResult);
    await enqueue({ table: 'teachers', operation: 'update', data: { subject: 'علوم' }, recordId: 't1', baseVersion: 'v1' });
    await drainOutbox(supabase);
    expect(await getOutboxEntries()).toHaveLength(0);
    const q = supabase.from.mock.results[0].value;
    expect(q.update).toHaveBeenCalledWith(expect.objectContaining({ subject: 'علوم', client_request_id: expect.any(String) }));
    expect(q.eq).toHaveBeenCalledWith('id', 't1');
  });

  it('replays a delete', async () => {
    const supabase = makeSupabaseMock(() => okResult);
    await enqueue({ table: 'students', operation: 'delete', data: {}, recordId: 's9', baseVersion: 'v1' });
    await drainOutbox(supabase);
    expect(await getOutboxEntries()).toHaveLength(0);
    const q = supabase.from.mock.results[0].value;
    expect(q.delete).toHaveBeenCalled();
    expect(q.eq).toHaveBeenCalledWith('id', 's9');
  });

  it('marks entry as failed and dispatches auth-expired on 401', async () => {
    const events = [];
    const sub = (ev) => events.push(ev);
    window.addEventListener('sync:auth-expired', sub);
    const supabase = makeSupabaseMock(makeErrorResponse.bind(null, authError));
    await enqueue({ table: 'students', operation: 'insert', data: {}, recordId: 'c2', baseVersion: 'v1' });
    await drainOutbox(supabase);
    const entries = await getOutboxEntries();
    expect(entries[0].status).toBe('failed');
    expect(entries[0].error).toBe('auth_expired');
    expect(events).toHaveLength(1);
    window.removeEventListener('sync:auth-expired', sub);
  });

  it('marks entry as failed with conflict and dispatches sync:conflict on 409', async () => {
    const events = [];
    const sub = (ev) => events.push(ev.detail);
    window.addEventListener('sync:conflict', sub);
    const supabase = makeSupabaseMock(makeErrorResponse.bind(null, conflictError));
    await enqueue({ table: 'students', operation: 'insert', data: {}, recordId: 'c3', baseVersion: 'v1' });
    await drainOutbox(supabase);
    const entries = await getOutboxEntries();
    expect(entries[0].status).toBe('failed');
    expect(entries[0].error).toBe('conflict');
    expect(events).toHaveLength(1);
    window.removeEventListener('sync:conflict', sub);
  });

  it('retries transient errors with backoff and eventually gives up', async () => {
    const supabase = makeSupabaseMock(makeErrorResponse.bind(null, genericError));
    await addToOutbox({ id: 'r1', table: 'students', operation: 'insert', data: { name: 'x' }, recordId: 'c4', baseVersion: 'v1', idempotencyKey: 'k1', createdAt: Date.now(), retries: 4, maxRetries: 5, status: 'pending' });
    await drainOutbox(supabase);
    const entries = await getOutboxEntries();
    expect(entries[0].status).toBe('failed');
    expect(entries[0].nextRetryAt).toBeUndefined();
  });
});

describe('enqueue', () => {
  beforeEach(async () => {
    const { getDB } = await import('../lib/offline-db');
    const db = await getDB();
    await db.clear('outbox');
  });

  it('creates a pending outbox entry with idempotency key', async () => {
    await enqueue({ table: 'students', operation: 'insert', data: { name: 'Ali' }, recordId: 'abc', baseVersion: 'v1' });
    const entries = await getOutboxEntries();
    expect(entries).toHaveLength(1);
    const e = entries[0];
    expect(e.status).toBe('pending');
    expect(e.maxRetries).toBe(5);
    expect(e.idempotencyKey).toBeTruthy();
    expect(e.retries).toBe(0);
  });
});

describe('coalesceEntries', () => {
  const entry = (id, table, operation, data = {}, createdAt = 1) => ({
    id, table, operation, data, recordId: data.id || id, baseVersion: 'v', createdAt, status: 'pending',
  });
  const deleteEntry = (id, table, recordId, createdAt = 1) => ({
    id, table, operation: 'delete', data: {}, recordId, baseVersion: 'v', createdAt, status: 'pending',
  });

  it('merges update into an earlier insert for the same record', () => {
    const out = coalesceEntries([
      entry('a', 'students', 'insert', { id: 's1', name: 'Ali' }, 1),
      entry('b', 'students', 'update', { id: 's1', name: 'Ali M' }, 2),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].operation).toBe('insert');
    expect(out[0].data.name).toBe('Ali M');
  });

  it('cancels out insert followed by delete', () => {
    const out = coalesceEntries([
      entry('a', 'students', 'insert', { id: 's1', name: 'Ali' }, 1),
      deleteEntry('b', 'students', 's1', 2),
    ]);
    expect(out).toHaveLength(0);
  });

  it('cancels out delete followed by insert (undo)', () => {
    const out = coalesceEntries([
      deleteEntry('a', 'students', 's1', 1),
      entry('b', 'students', 'insert', { id: 's1', name: 'Ali' }, 2),
    ]);
    expect(out).toHaveLength(0);
  });

  it('keeps entries for different records separate', () => {
    const out = coalesceEntries([
      entry('a', 'students', 'insert', { id: 's1' }, 1),
      entry('b', 'payments', 'insert', { id: 'p1' }, 2),
    ]);
    expect(out).toHaveLength(2);
  });

  it('sorts by createdAt ascending', () => {
    const out = coalesceEntries([
      entry('a', 's', 'insert', { id: 'x' }, 5),
      entry('b', 's', 'insert', { id: 'y' }, 1),
    ]);
    expect(out.map(o => o.createdAt)).toEqual([1, 5]);
  });
});

describe('removeByTableAndRecord', () => {
  beforeEach(async () => {
    const { getDB } = await import('../lib/offline-db');
    const db = await getDB();
    await db.clear('outbox');
  });

  it('removes queued entries for a specific record', async () => {
    await addToOutbox({ id: 'q1', table: 'teachers', operation: 'insert', recordId: 't1', status: 'pending' });
    await addToOutbox({ id: 'q2', table: 'teachers', operation: 'update', recordId: 't1', status: 'pending' });
    await addToOutbox({ id: 'q3', table: 'teachers', operation: 'insert', recordId: 't2', status: 'pending' });
    await removeByTableAndRecord('teachers', 't1');
    const remaining = await getOutboxEntries();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].recordId).toBe('t2');
  });
});
