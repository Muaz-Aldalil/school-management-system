import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'pwa_installed';

export default function useInstallPrompt() {
  const [isInstallable, setIsInstallable] = useState(false);
  const deferredRef = useState({ current: null })[0];

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    if (window.matchMedia?.('(display-mode: standalone)').matches) return;

    const handler = (e) => {
      e.preventDefault();
      deferredRef.current = e;
      setIsInstallable(true);
    };

    const onInstalled = () => {
      localStorage.setItem(STORAGE_KEY, '1');
      setIsInstallable(false);
      deferredRef.current = null;
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [deferredRef]);

  const install = useCallback(async () => {
    const deferred = deferredRef.current;
    if (!deferred) return;
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === 'accepted') {
        localStorage.setItem(STORAGE_KEY, '1');
        setIsInstallable(false);
      }
    } catch { /* prompt cancelled or failed */ }
    deferredRef.current = null;
  }, [deferredRef]);

  return { isInstallable, install };
}
