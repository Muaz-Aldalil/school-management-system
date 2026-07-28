import { useReveal } from '../hooks/useReveal';

export default function Reveal({ children, className = '', delay = 0 }) {
  const [ref, visible] = useReveal({ threshold: 0.05 });
  return (
    <div ref={ref} aria-hidden={!visible} className={`${visible ? 'animate-fade-up' : 'opacity-0'} ${className}`} style={{ animationDelay: `${delay}s` }}>
      {children}
    </div>
  );
}
