import { Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function LangToggle() {
  const { lang, setLang } = useLanguage();
  const next = lang === 'en' ? 'عربي' : 'EN';
  return (
    <button
      onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-low text-secondary hover:bg-surface-container-high hover:text-primary transition-colors text-xs font-bold"
      title={lang === 'en' ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية'}
    >
      <Globe className="w-4 h-4" />
      {next}
    </button>
  );
}
