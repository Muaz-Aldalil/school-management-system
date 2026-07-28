import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { LanguageProvider } from './context/LanguageContext';
import { SchoolProvider } from './context/SchoolContext';
import { AuthProvider } from './context/AuthContext';
import { LandingProvider } from './context/LandingContext';
import { drainOutbox } from './lib/sync-engine';
import { supabase } from './lib/supabase';
import { t } from './lib/i18n';
import App from './App';
import './index.css';
import './styles/print.css';

// --- Service Worker registration + sync triggers ---
if ('serviceWorker' in navigator && !import.meta.env.DEV) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
              if (window.confirm(t('notifications.swUpdatePrompt'))) {
                window.location.reload();
              }
            }
          });
        }
      });

      // Listen for SYNC_OUTBOX messages from SW
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SYNC_OUTBOX') {
          drainOutbox(supabase);
        }
      });
    }).catch(() => {});
  });
}

// --- Online event: drain outbox ---
window.addEventListener('online', () => {
  drainOutbox(supabase);
});

// --- Visibility change: drain outbox when tab becomes visible ---
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && navigator.onLine) {
    drainOutbox(supabase);
  }
});

// --- App launch: drain outbox if pending entries exist ---
import('./lib/offline-db').then(({ getPendingCount }) => {
  getPendingCount().then(count => {
    if (count > 0 && navigator.onLine) {
      drainOutbox(supabase);
    }
  }).catch(() => {});
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
    <BrowserRouter>
      <AuthProvider>
        <SchoolProvider>
          <LanguageProvider>
            <LandingProvider>
              <App />
            </LandingProvider>
          </LanguageProvider>
        </SchoolProvider>
      </AuthProvider>
    </BrowserRouter>
    </HelmetProvider>
  </StrictMode>
);
