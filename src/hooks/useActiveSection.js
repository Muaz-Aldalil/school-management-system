import { useState, useEffect, useRef } from 'react';

export default function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0] || '');
  const ref = useRef(ids);
  ref.current = ids;

  useEffect(() => {
    const onScroll = () => {
      let current = ref.current[0];
      for (const id of ref.current) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 100) current = id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return active;
}
