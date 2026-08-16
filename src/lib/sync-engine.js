import {
  addToOutbox,
  getOutboxEntries,
  updateOutboxEntry,
  deleteOutboxEntry,
} from './offline-db';

let isSyncing = false;

export function enqueue({ table, operation, data, recordId, baseVersion }) {
  return addToOutbox({
    id: crypto.randomUUID(),
    table,
    operation,
    data,
    recordId,
    baseVersion,
    idempotencyKey: crypto.randomUUID(),
    createdAt: Date.now(),
    retries: 0,
    maxRetries: 5,
    status: 'pending',
  });
}

export function coalesceEntries(entries) {
  const byEntity = new Map();
  for (const e of entries) {
    const key = `${e.table}:${e.recordId || e.data?.id || 'new'}`;
    const existing = byEntity.get(key);
    if (!existing) {
      byEntity.set(key, e);
    } else if (
      (existing.operation === 'insert' && e.operation === 'delete') ||
      (existing.operation === 'delete' && e.operation === 'insert')
    ) {
      byEntity.delete(key);
    } else {
      byEntity.set(key, {
        ...existing,
        data: { ...existing.data, ...e.data },
        baseVersion: existing.baseVersion < e.baseVersion ? existing.baseVersion : e.baseVersion,
        createdAt: Math.min(existing.createdAt, e.createdAt),
      });
    }
  }
  return [...byEntity.values()].sort((a, b) => a.createdAt - b.createdAt);
}

export async function drainOutbox(supabase) {
  if (!supabase || isSyncing) return;

  if ('locks' in navigator) {
    await navigator.locks.request('sync-lock', { mode: 'exclusive' }, () => doDrain(supabase));
  } else {
    await doDrain(supabase);
  }
}

async function doDrain(supabase) {
  isSyncing = true;
  try {
    const pending = await getOutboxEntries('pending');
    if (!pending.length) return;

    const coalesced = coalesceEntries(pending);

    for (const entry of coalesced) {
      const fresh = (await getOutboxEntries('pending')).find(e => e.id === entry.id);
      if (!fresh) continue;

      await updateOutboxEntry(entry.id, { status: 'syncing' });

      try {
        await replayEntry(supabase, entry);
        await deleteOutboxEntry(entry.id);
      } catch (err) {
        const status = err?.status || err?.code || 0;

        if (status === 409) {
          await updateOutboxEntry(entry.id, {
            status: 'failed',
            error: 'conflict',
            serverVersion: err.serverRecord,
          });
          window.dispatchEvent(new CustomEvent('sync:conflict', { detail: entry }));
          continue;
        }

        if (status === 401 || status === 403) {
          await updateOutboxEntry(entry.id, { status: 'failed', error: 'auth_expired' });
          window.dispatchEvent(new CustomEvent('sync:auth-expired'));
          break;
        }

        const retries = entry.retries + 1;
        if (retries >= entry.maxRetries) {
          await updateOutboxEntry(entry.id, { status: 'failed', error: err.message || 'max_retries' });
        } else {
          await updateOutboxEntry(entry.id, {
            status: 'pending',
            retries,
            nextRetryAt: Date.now() + Math.min(1000 * 2 ** retries, 60000),
          });
        }
      }
    }

    window.dispatchEvent(new CustomEvent('sync:complete'));
  } finally {
    isSyncing = false;
  }
}

async function replayEntry(supabase, entry) {
  const { table, operation, data, recordId, idempotencyKey } = entry;

  switch (operation) {
    case 'insert': {
      const { data: created, error } = await supabase
        .from(table)
        .insert({ ...data, client_request_id: idempotencyKey })
        .select()
        .single();
      if (error) throw error;
      return created;
    }
    case 'update': {
      const { error } = await supabase
        .from(table)
        .update({ ...data, client_request_id: idempotencyKey })
        .eq('id', recordId);
      if (error) throw error;
      break;
    }
    case 'delete': {
      const { error } = await supabase.from(table).delete().eq('id', recordId);
      if (error) throw error;
      break;
    }
    case 'delete_cascade': {
      await supabase.from('grades').delete().eq('student_id', recordId);
      await supabase.from('payments').delete().eq('student_id', recordId);
      const { error } = await supabase.from('students').delete().eq('id', recordId);
      if (error) throw error;
      break;
    }
  }
}

export async function removeByTableAndRecord(table, recordId) {
  const all = await getOutboxEntries();
  for (const e of all) {
    if (e.table === table && e.recordId === recordId) {
      await deleteOutboxEntry(e.id);
    }
  }
}

export function onSyncAuthExpired(callback) {
  window.addEventListener('sync:auth-expired', callback);
  return () => window.removeEventListener('sync:auth-expired', callback);
}

export function onSyncComplete(callback) {
  window.addEventListener('sync:complete', callback);
  return () => window.removeEventListener('sync:complete', callback);
}

export function onSyncConflict(callback) {
  const handler = (e) => callback(e.detail);
  window.addEventListener('sync:conflict', handler);
  return () => window.removeEventListener('sync:conflict', handler);
}

export function isSyncingActive() {
  return isSyncing;
}
