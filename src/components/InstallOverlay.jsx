import { useState, useEffect, useRef, useCallback } from 'react';
import { Download } from 'lucide-react';
import useInstallPrompt from '../hooks/useInstallPrompt';

export default function InstallOverlay() {
  const { isInstallable, install } = useInstallPrompt();
  const [visible, setVisible] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    if (isInstallable) setVisible(true);
  }, [isInstallable]);

  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const esc = (e) => { if (e.key === 'Escape') setVisible(false); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [visible]);

  const handleBackdrop = useCallback((e) => {
    if (cardRef.current && !cardRef.current.contains(e.target)) setVisible(false);
  }, []);

  const handleInstall = useCallback(async () => {
    await install();
    setVisible(false);
  }, [install]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="تثبيت التطبيق"
      onClick={handleBackdrop}
    >
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        ref={cardRef}
        className="relative bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-sm animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center p-8 text-center">
          <img src="/images/icon-192.png" alt="" className="w-20 h-20 rounded-2xl shadow-lg mb-5" />
          <h2 className="text-xl font-bold text-on-surface mb-2">مدرسه العامريه</h2>
          <p className="text-sm text-secondary mb-8 leading-relaxed">أضف التطبيق إلى شاشة الرئيسية للوصول السريع</p>
          <button
            onClick={handleInstall}
            className="w-full h-12 rounded-xl bg-primary text-on-primary font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary-container transition-colors"
          >
            <Download className="w-4 h-4" />
            تثبيت التطبيق
          </button>
          <button
            onClick={() => setVisible(false)}
            className="mt-4 text-sm text-secondary hover:text-on-surface transition-colors"
          >
            لاحقاً
          </button>
        </div>
      </div>
    </div>
  );
}
