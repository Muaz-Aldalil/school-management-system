import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, GraduationCap, Award, CalendarDays } from 'lucide-react';
import { useLanding } from '../../context/LandingContext';
import { useLanguage } from '../../context/LanguageContext';
import { localized } from '../../lib/localized';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

const STAT_ICONS = [Users, GraduationCap, Award, CalendarDays];

const HERO_IMAGES = [
  '/images/hero-1.jpg',
  '/images/hero-2.jpg',
  '/images/hero-3.jpg',
];

const BG_INTERVAL = 5000;

export default function Hero() {
  const { hero } = useLanding();
  const { t, lang } = useLanguage();
  const [activeBg, setActiveBg] = useState(0);

  const title = localized(hero.title, lang);
  const subtitle = localized(hero.subtitle, lang);
  const ctaText = localized(hero.cta_text, lang);
  const stats = Array.isArray(hero.stats) ? hero.stats.slice(0, 4) : [];

  useEffect(() => {
    HERO_IMAGES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;
    const timer = setInterval(() => {
      setActiveBg((prev) => (prev + 1) % HERO_IMAGES.length);
    }, BG_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  return (
    <section id="hero" className="relative min-h-[80vh] flex items-center overflow-hidden bg-background">
      {/* Background images — all screen sizes */}
      <div className="absolute inset-0">
        {HERO_IMAGES.map((src, i) => (
          <div
            key={src}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${i === activeBg ? 'opacity-100' : 'opacity-0'}`}
            style={{ backgroundImage: `url(${src})` }}
            aria-hidden="true"
          />
        ))}
        {/* Scrim for readability */}
        <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/60" aria-hidden="true" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 py-24 sm:py-28 md:py-32">
        <motion.div
          className="mx-auto flex max-w-4xl flex-col items-center text-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.h1
            className="text-4xl font-bold tracking-tight text-white font-display drop-shadow-lg sm:text-6xl"
            variants={itemVariants}
          >
            {title}
          </motion.h1>
          {subtitle && (
            <motion.p variants={itemVariants} className="mt-6 max-w-2xl text-lg text-white/90 drop-shadow-md sm:text-xl">
              {subtitle}
            </motion.p>
          )}
          <motion.div variants={itemVariants} className="mt-8 flex flex-wrap justify-center gap-4">
            {ctaText && (
              <a
                href={hero.cta_link || '#about'}
                className="inline-flex items-center justify-center h-11 rounded-md px-8 text-sm font-medium bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-lg"
              >
                {ctaText}
              </a>
            )}
            <a
              href="#contact"
              className="inline-flex items-center justify-center h-11 rounded-md px-8 text-sm font-medium border border-white/40 bg-white/10 text-white hover:bg-white/20 transition-colors shadow-lg backdrop-blur-sm"
            >
              {t('hero.contactUs')}
            </a>
          </motion.div>
          {stats.length > 0 && (
            <motion.div variants={itemVariants} className="mt-12 grid w-full grid-cols-2 gap-x-8 gap-y-6 sm:flex sm:w-auto sm:flex-wrap sm:justify-center sm:gap-x-12 sm:gap-y-8">
              {stats.map((stat, index) => {
                const Icon = STAT_ICONS[index] || Users;
                const value = typeof stat.value === 'number' ? stat.value.toLocaleString(lang === 'ar' ? 'ar' : 'en-US') : stat.value;
                const label = localized(stat.label, lang);
                return (
                  <div key={index} className="flex items-center gap-3 justify-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20 backdrop-blur-sm">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-start">
                      <p className="text-xl font-bold text-white drop-shadow-md">{value}</p>
                      {label && <p className="text-sm text-white/80">{label}</p>}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
