import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const TIMEOUT = 30 * 60 * 1000;

export function useAutoLogout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const timer = useRef(null);

  useEffect(() => {
    if (!user) return;

    const reset = () => {
      if (reset._last && Date.now() - reset._last < 5000) return;
      reset._last = Date.now();
      clearTimeout(timer.current);
      timer.current = setTimeout(() => { signOut(); navigate('/login'); }, TIMEOUT);
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      clearTimeout(timer.current);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [user, signOut, navigate]);
}
