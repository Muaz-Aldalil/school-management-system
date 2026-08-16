import { describe, it, expect, beforeEach } from 'vitest';
import {
  getDB,
  getAll,
  getById,
  put,
  putMany,
  deleteRecord,
  clearStore,
  getSetting,
  setSetting,
  addToOutbox,
  getOutboxEntries,
  updateOutboxEntry,
  deleteOutboxEntry,
  getPendingCount,
  migrateFromLocalStorage,
} from '../lib/offline-db';

beforeEach(async () => {
  const db = await getDB();
  await Promise.all(['students', 'grades', 'payments', 'settings', 'outbox'].map(s => db.clear(s)));
});

describe('offline-db CRUD', () => {
  it('puts and gets a record by id', async () => {
    await put('students', { id: 's1', name: 'Ahmed', updated_at: 1 });
    const row = await getById('students', 's1');
    expect(row.name).toBe('Ahmed');
  });

  it('getAll returns all records', async () => {
    await putMany('students', [{ id: 'a', name: 'x' }, { id: 'b', name: 'y' }]);
    expect((await getAll('students')).map(s => s.id).sort()).toEqual(['a', 'b']);
  });

  it('putMany with empty array is a no-op', async () => {
    await putMany('students', []);
    expect(await getAll('students')).toHaveLength(0);
  });

  it('deletes a record', async () => {
    await put('grades', { id: 'g1' });
    await deleteRecord('grades', 'g1');
    expect(await getById('grades', 'g1')).toBeUndefined();
  });

  it('clears a store', async () => {
    await putMany('payments', [{ id: 'p1' }, { id: 'p2' }]);
    await clearStore('payments');
    expect(await getAll('payments')).toHaveLength(0);
  });
});

describe('offline-db settings', () => {
  it('round-trips a setting value', async () => {
    await setSetting('supervisors', ['a', 'b']);
    expect(await getSetting('supervisors')).toEqual(['a', 'b']);
    expect(await getSetting('missing')).toBeUndefined();
  });
});

describe('offline-db outbox', () => {
  it('adds and lists pending entries', async () => {
    await addToOutbox({ id: 'e1', table: 'students', operation: 'insert', status: 'pending' });
    await addToOutbox({ id: 'e2', table: 'payments', operation: 'update', status: 'pending' });
    const all = await getOutboxEntries();
    expect(all).toHaveLength(2);
    const pending = await getOutboxEntries('pending');
    expect(pending).toHaveLength(2);
  });

  it('updates an entry status', async () => {
    await addToOutbox({ id: 'e1', table: 'students', operation: 'insert', status: 'pending' });
    await updateOutboxEntry('e1', { status: 'syncing' });
    expect((await getOutboxEntries('syncing'))[0].id).toBe('e1');
    expect(await getPendingCount()).toBe(0);
  });

  it('deletes an entry', async () => {
    await addToOutbox({ id: 'e1', table: 'students', operation: 'insert', status: 'pending' });
    await deleteOutboxEntry('e1');
    expect(await getOutboxEntries()).toHaveLength(0);
  });

  it('getPendingCount counts only pending entries', async () => {
    await addToOutbox({ id: 'a', table: 's', operation: 'insert', status: 'pending' });
    await addToOutbox({ id: 'b', table: 's', operation: 'insert', status: 'failed' });
    expect(await getPendingCount()).toBe(1);
  });
});

describe('migrateFromLocalStorage', () => {
  beforeEach(() => localStorage.clear());

  it('migrates students, grades and payments into IndexedDB once', async () => {
    localStorage.setItem('eduadmin_school_data_u1', JSON.stringify({
      students: [{ id: 's1', name: 'Ali' }],
      grades: [{ id: 'g1', student_id: 's1', score: 90 }],
      payments: [{ id: 'p1', student_id: 's1', amount: 100 }],
      settings: { supervisors: ['a'] },
    }));
    await migrateFromLocalStorage('u1');
    expect((await getAll('students'))[0].name).toBe('Ali');
    expect((await getAll('grades'))[0].score).toBe(90);
    expect((await getAll('payments'))[0].amount).toBe(100);
    expect(await getSetting('supervisors')).toEqual(['a']);
    expect(localStorage.getItem('eduadmin_school_data_u1')).toBeNull();

    await migrateFromLocalStorage('u1');
    expect(await getAll('students')).toHaveLength(1);
  });

  it('marks migration done when no cache exists', async () => {
    await migrateFromLocalStorage('u2');
    expect(await getSetting('offline_migration_v1')).toBe(true);
  });
});
