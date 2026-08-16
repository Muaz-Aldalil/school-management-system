import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { en, ar } from '../i18n/translations';

export const LanguageContext = createContext(null);

function getNested(obj, path) {
  return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : null), obj);
}

const LANG = 'ar';

export function LanguageProvider({ children }) {
  const [lang] = useState(LANG);

  useEffect(() => {
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = LANG;
  }, []);

  const t = useCallback((key, params = {}) => {
    const val = getNested(lang === 'ar' ? ar : en, key);
    if (!val) return key;
    return Object.entries(params).reduce((s, [k, v]) => s.replace(`{${k}}`, v), val);
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ t, lang, dir: 'rtl' }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
