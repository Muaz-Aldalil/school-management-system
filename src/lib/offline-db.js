import { openDB } from 'idb';

const DB_NAME = 'al-amiriya-school-offline';
const DB_VERSION = 1;

let dbPromise = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const students = db.createObjectStore('students', { keyPath: 'id' });
        students.createIndex('updated_at', 'updated_at');
        students.createIndex('class', 'class');

        const grades = db.createObjectStore('grades', { keyPath: 'id' });
        grades.createIndex('student_id', 'student_id');
        grades.createIndex('updated_at', 'updated_at');

        const payments = db.createObjectStore('payments', { keyPath: 'id' });
        payments.createIndex('student_id', 'student_id');
        payments.createIndex('updated_at', 'updated_at');

        db.createObjectStore('settings', { keyPath: 'key' });

        const outbox = db.createObjectStore('outbox', { keyPath: 'id' });
        outbox.createIndex('status', 'status');
        outbox.createIndex('createdAt', 'createdAt');
        outbox.createIndex('table_status', ['table', 'status']);
      },
    }).catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

// --- Generic CRUD ---

export async function getAll(store) {
  const db = await getDB();
  return db.getAll(store);
}

export async function getById(store, id) {
  const db = await getDB();
  return db.get(store, id);
}

export async function put(store, record) {
  const db = await getDB();
  return db.put(store, record);
}

export async function putMany(store, records) {
  if (!records?.length) return;
  const db = await getDB();
  const tx = db.transaction(store, 'readwrite');
  await Promise.all([...records.map(r => tx.store.put(r)), tx.done]);
}

export async function deleteRecord(store, id) {
  const db = await getDB();
  return db.delete(store, id);
}

export async function clearStore(store) {
  const db = await getDB();
  return db.clear(store);
}

// --- Settings ---

export async function getSetting(key) {
  const db = await getDB();
  const record = await db.get('settings', key);
  return record?.value;
}

export async function setSetting(key, value) {
  const db = await getDB();
  return db.put('settings', { key, value });
}

// --- Outbox ---

export async function addToOutbox(entry) {
  const db = await getDB();
  return db.put('outbox', entry);
}

export async function getOutboxEntries(status) {
  const db = await getDB();
  if (status) return db.getAllFromIndex('outbox', 'status', status);
  return db.getAll('outbox');
}

export async function updateOutboxEntry(id, updates) {
  const db = await getDB();
  const entry = await db.get('outbox', id);
  if (entry) await db.put('outbox', { ...entry, ...updates });
}

export async function deleteOutboxEntry(id) {
  const db = await getDB();
  return db.delete('outbox', id);
}

export async function findOutboxByIndex(indexName, value) {
  const db = await getDB();
  return db.getAllFromIndex('outbox', indexName, value);
}

export async function getPendingCount() {
  const db = await getDB();
  const pending = await db.getAllFromIndex('outbox', 'status', 'pending');
  return pending.length;
}

// --- localStorage Migration ---

const MIGRATION_KEY = 'offline_migration_v1';

export async function migrateFromLocalStorage(userId) {
  const alreadyMigrated = await getSetting(MIGRATION_KEY);
  if (alreadyMigrated) return;

  const cacheKey = `eduadmin_school_data_${userId}`;
  const cached = localStorage.getItem(cacheKey);
  if (!cached) {
    await setSetting(MIGRATION_KEY, true);
    return;
  }

  try {
    const data = JSON.parse(cached);
    const db = await getDB();
    const tx = db.transaction(['students', 'grades', 'payments', 'settings'], 'readwrite');

    if (data.students?.length) {
      await Promise.all(data.students.map(s => tx.objectStore('students').put(s)));
    }
    if (data.grades?.length) {
      await Promise.all(data.grades.map(g => tx.objectStore('grades').put(g)));
    }
    if (data.payments?.length) {
      await Promise.all(data.payments.map(p => tx.objectStore('payments').put(p)));
    }
    if (data.settings) {
      await tx.objectStore('settings').put({ key: 'supervisors', value: data.settings.supervisors });
      await tx.objectStore('settings').put({ key: 'accountants', value: data.settings.accountants });
    }
    if (data.schoolInfo) {
      await tx.objectStore('settings').put({ key: 'schoolInfo', value: data.schoolInfo });
    }

    await tx.done;
    await setSetting(MIGRATION_KEY, true);
    localStorage.removeItem(cacheKey);
  } catch {
    await setSetting(MIGRATION_KEY, true);
  }
}
