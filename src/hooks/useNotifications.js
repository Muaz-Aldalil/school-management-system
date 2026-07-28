import { useState, useEffect, useCallback } from 'react';
import { supabase, dbAvailable } from '../lib/supabase';

export function useNotifications(limit = 20) {
  const [notifications, setNotifications] = useState([]);

  const fetch = useCallback(async () => {
    if (!dbAvailable) return;
    const local = JSON.parse(localStorage.getItem('honor_congrats') || '[]');
    const localNotifs = local.map((n, i) => ({
      id: `local-${i}`, message: n.message, created_at: new Date(n.at).toISOString(), read: false, isLocal: true,
    }));
    const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(limit);
    setNotifications([...localNotifs, ...(data || [])]);
  }, [limit]);

  useEffect(() => { fetch(); }, [fetch]);

  const markRead = useCallback(async (id) => {
    if (id.startsWith('local-')) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      return;
    }
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    fetch();
  }, [fetch]);

  return { notifications, markRead, refetch: fetch };
}
