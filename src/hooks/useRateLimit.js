import { useState, useRef, useEffect, useCallback } from 'react';

export function useRateLimit({ maxAttempts = 3, baseDelay = 2000 } = {}) {
  const [blocked, setBlocked] = useState(false);
  const attempts = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const recordFailure = useCallback(() => {
    attempts.current++;
    if (attempts.current >= maxAttempts) {
      const delay = baseDelay * Math.pow(2, attempts.current - maxAttempts);
      setBlocked(true);
      timerRef.current = setTimeout(() => { setBlocked(false); attempts.current = 0; }, delay);
    }
  }, [maxAttempts, baseDelay]);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    attempts.current = 0;
    setBlocked(false);
  }, []);

  return { blocked, recordFailure, reset };
}
