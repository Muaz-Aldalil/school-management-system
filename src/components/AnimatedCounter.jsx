import { useEffect, useRef, useState } from 'react';

export default function AnimatedCounter({ value, duration = 1200, prefix = '', suffix = '', decimals = 0 }) {
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const fromRef = useRef(0);
  displayRef.current = display;

  useEffect(() => {
    if (typeof value !== 'number' || isNaN(value)) return;
    fromRef.current = displayRef.current;
    startRef.current = null;

    const animate = (timestamp) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = fromRef.current + (value - fromRef.current) * eased;
      setDisplay(current);
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);

  const formatted = decimals > 0
    ? display.toFixed(decimals)
    : Math.round(display).toLocaleString();

  return <span>{prefix}{formatted}{suffix}</span>;
}
