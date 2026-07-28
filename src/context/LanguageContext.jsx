import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { en, ar } from '../i18n/translations';

export const LanguageContext = createContext(null);

function getNested(obj, path) {
  return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : null), obj);
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('lang') || 'ar');

  const setLang = useCallback((l) => {
    setLangState(l);
    localStorage.setItem('lang', l);
  }, []);

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback((key, params = {}) => {
    const val = getNested(lang === 'ar' ? ar : en, key);
    if (!val) return key;
    return Object.entries(params).reduce((s, [k, v]) => s.replace(`{${k}}`, v), val);
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ t, lang, setLang, dir: lang === 'ar' ? 'rtl' : 'ltr' }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
