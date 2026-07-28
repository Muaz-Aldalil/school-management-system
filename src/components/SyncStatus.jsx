import { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getPendingCount } from '../lib/offline-db';
import { drainOutbox } from '../lib/sync-engine';
import { supabase } from '../lib/supabase';

export default function SyncStatus() {
  const { t } = useLanguage();
  const [online, setOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSync, setLastSync] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [authExpired, setAuthExpired] = useState(false);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const count = await getPendingCount();
        setPendingCount(count);
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onAuthExpired = () => setAuthExpired(true);
    const onComplete = () => { setLastSync(new Date()); setPendingCount(0); };
    window.addEventListener('sync:auth-expired', onAuthExpired);
    window.addEventListener('sync:complete', onComplete);
    return () => {
      window.removeEventListener('sync:auth-expired', onAuthExpired);
      window.removeEventListener('sync:complete', onComplete);
    };
  }, []);

  useEffect(() => {
    const onOnline = () => { setOnline(true); setAuthExpired(false); };
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const handleSync = useCallback(async () => {
    if (!online || syncing) return;
    setSyncing(true);
    try {
      await drainOutbox(supabase);
      setLastSync(new Date());
    } finally {
      setSyncing(false);
    }
  }, [online, syncing]);

  if (authExpired) {
    return (
      <div role="status" aria-live="polite" className="fixed bottom-4 start-4 z-50 flex items-center gap-2 px-4 py-2.5 bg-warning/10 border border-warning/30 text-warning rounded-xl text-sm font-semibold shadow-lg backdrop-blur-sm">
        <AlertTriangle className="w-4 h-4" />
        <span>{t('sync.sessionExpired')}</span>
      </div>
    );
  }

  if (!online) {
    return (
      <div role="status" aria-live="assertive" className="fixed bottom-4 start-4 z-50 flex items-center gap-2 px-4 py-2.5 bg-error/10 border border-error/30 text-error rounded-xl text-sm font-semibold shadow-lg backdrop-blur-sm animate-slide-up">
        <WifiOff className="w-4 h-4" />
        <span>{t('common.offline')}</span>
        {pendingCount > 0 && (
          <span className="ms-2 px-2 py-0.5 bg-error/20 rounded-full text-xs">
            {pendingCount} {t('sync.pending')}
          </span>
        )}
      </div>
    );
  }

  if (pendingCount > 0 || syncing) {
    return (
      <div role="status" aria-live="polite" className="fixed bottom-4 start-4 z-50 flex items-center gap-2 px-4 py-2.5 bg-info/10 border border-info/30 text-info rounded-xl text-sm font-semibold shadow-lg backdrop-blur-sm">
        {syncing ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          <Wifi className="w-4 h-4" />
        )}
        <span>{syncing ? t('sync.syncing') : `${pendingCount} ${t('sync.pending')}`}</span>
        {!syncing && (
          <button onClick={handleSync} className="ms-2 underline text-xs">
            {t('sync.syncNow')}
          </button>
        )}
        {lastSync && (
          <span className="ms-2 text-xs opacity-60">
            {t('sync.lastSynced')}: {lastSync.toLocaleTimeString()}
          </span>
        )}
      </div>
    );
  }

  if (lastSync) {
    return (
      <div role="status" aria-live="polite" className="fixed bottom-4 start-4 z-50 flex items-center gap-2 px-4 py-2.5 bg-success/10 border border-success/30 text-success rounded-xl text-sm font-semibold shadow-lg backdrop-blur-sm animate-slide-up">
        <Check className="w-4 h-4" />
        <span>{t('sync.allSynced')}</span>
        <span className="ms-2 text-xs opacity-60">
          {lastSync.toLocaleTimeString()}
        </span>
      </div>
    );
  }

  return null;
}
