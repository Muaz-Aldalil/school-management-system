import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const id = useRef(0);
  const timers = useRef([]);

  const show = useCallback((message, type = 'success') => {
    const tid = ++id.current;
    setToasts(t => [...t, { id: tid, message, type }]);
    const timer = setTimeout(() => setToasts(t => t.filter(x => x.id !== tid)), 3000);
    timers.current.push(timer);
  }, []);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`pointer-events-auto animate-slide-up px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold backdrop-blur-sm ${
            t.type === 'success' ? 'bg-tertiary/95 text-on-tertiary border-tertiary/30' :
            t.type === 'error' ? 'bg-error/95 text-on-error border-error/30' :
            'bg-surface-container-lowest/95 text-on-surface border-outline-variant'
          }`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
