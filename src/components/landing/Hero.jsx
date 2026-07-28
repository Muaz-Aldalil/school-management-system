import { useState } from 'react';
import { Mail, Phone, ChevronDown } from 'lucide-react';
import { useLanding } from '../../context/LandingContext';
import { useLanguage } from '../../context/LanguageContext';
import { localized } from '../../lib/localized';

export default function Hero() {
  const { hero } = useLanding();
  const { t, lang } = useLanguage();
  const [logoError, setLogoError] = useState(false);

  return (
    <section id="hero" className="relative w-full overflow-hidden bg-background min-h-screen flex items-center justify-center">
      {/* subtle background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-1/4 h-64 w-64 rounded-full bg-primary/[0.04]" />
        <div className="absolute -right-20 bottom-1/4 h-48 w-48 rounded-full bg-tertiary/[0.04]" />
        <div className="absolute left-1/2 top-0 h-32 w-32 -translate-x-1/2 rounded-full bg-secondary/[0.03]" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center px-4 pt-16 pb-12 animate-fade-up">
        {/* logo */}
        <div className="mb-8">
          {!logoError ? (
            <img
              src="/favicon.svg"
              alt={localized(hero.title, lang)}
              className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl shadow-lg"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
              <span className="text-4xl sm:text-5xl font-bold text-on-primary">ع</span>
            </div>
          )}
        </div>

        {/* school name */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-display tracking-tight text-on-background">
          {localized(hero.title, lang)}
        </h1>

        {/* coming soon badge */}
        <div className="mt-6 inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-primary/10 border border-primary/20">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
          </span>
          <span className="text-sm font-semibold text-primary tracking-wide uppercase">
            {t('hero.comingSoon')}
          </span>
        </div>

        {/* tagline */}
        <p className="mt-6 max-w-lg text-lg text-secondary leading-relaxed">
          {localized(hero.subtitle, lang)}
        </p>

        {/* contact */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 sm:gap-8 text-sm text-secondary">
          <a href="mailto:muazaldalil@gmail.com" className="flex items-center gap-2 hover:text-primary transition-colors">
            <Mail className="w-4 h-4" />
            muazaldalil@gmail.com
          </a>
          <a href="tel:+249904293228" className="flex items-center gap-2 hover:text-primary transition-colors">
            <Phone className="w-4 h-4" />
            +249 90 429 3228
          </a>
        </div>

        {/* scroll indicator */}
        <div className="mt-16 animate-bounce">
          <ChevronDown className="w-6 h-6 text-secondary/50" />
        </div>
      </div>
    </section>
  );
}
