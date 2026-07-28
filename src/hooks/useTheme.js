import { useState, useEffect, useCallback } from 'react';

export default function useTheme() {
  const [theme, setThemeState] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggle = useCallback(() => setThemeState(t => t === 'light' ? 'dark' : 'light'), []);

  return { theme, toggle };
}
