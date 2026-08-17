import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, GraduationCap, Award, CalendarDays } from 'lucide-react';
import { useLanding } from '../../context/LandingContext';
import { useLanguage } from '../../context/LanguageContext';
import { localized } from '../../lib/localized';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.2 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const imageVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } },
};

const floatingVariants = {
  animate: { y: [0, -8, 0], transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' } },
};

const STAT_ICONS = [Users, GraduationCap, Award, CalendarDays];

const HERO_IMAGES = ['/images/hero-1.jpg', '/images/hero-2.jpg', '/images/hero-3.jpg'];

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
    HERO_IMAGES.forEach((src) => { const img = new Image(); img.src = src; });
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;
    const timer = setInterval(() => { setActiveBg((prev) => (prev + 1) % HERO_IMAGES.length); }, BG_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  return (
    <section id="hero">
      {/* ── Mobile + tablet hero (bg images) ── */}
      <div className="lg:hidden relative min-h-[100dvh] pt-16 flex items-center overflow-hidden bg-background">
        <div className="absolute inset-0">
          {HERO_IMAGES.map((src, i) => (
            <div key={src} className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${i === activeBg ? 'opacity-100' : 'opacity-0'}`} style={{ backgroundImage: `url(${src})` }} aria-hidden="true" />
          ))}
          <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/60" aria-hidden="true" />
        </div>
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 py-24 sm:py-28">
          <motion.div className="mx-auto flex max-w-4xl flex-col items-center text-center" variants={containerVariants} initial="hidden" animate="visible">
            <motion.h1 className="text-4xl font-bold tracking-tight text-white font-display drop-shadow-lg" variants={itemVariants}>
              {title}
            </motion.h1>
            {subtitle && (
              <motion.p variants={itemVariants} className="mt-6 max-w-2xl text-lg text-white/90 drop-shadow-md">
                {subtitle}
              </motion.p>
            )}
            <motion.div variants={itemVariants} className="mt-8 flex flex-wrap justify-center gap-4">
              {ctaText && (
                <a href={hero.cta_link || '#about'} className="inline-flex items-center justify-center h-11 rounded-md px-8 text-sm font-medium bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-lg">
                  {ctaText}
                </a>
              )}
              <a href="#contact" className="inline-flex items-center justify-center h-11 rounded-md px-8 text-sm font-medium border border-white/40 bg-white/10 text-white hover:bg-white/20 transition-colors shadow-lg backdrop-blur-sm">
                {t('hero.contactUs')}
              </a>
            </motion.div>
            {stats.length > 0 && (
              <motion.div variants={itemVariants} className="mt-12 grid w-full grid-cols-2 gap-x-8 gap-y-6">
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
      </div>

      {/* ── Desktop hero (two-column) ── */}
      <div className="hidden lg:block w-full overflow-hidden bg-background py-12 lg:py-24">
        <div className="container mx-auto grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-8 px-4 md:px-6">
          {/* Left column: text + actions + stats */}
          <motion.div className="flex flex-col items-center text-center" variants={containerVariants} initial="hidden" animate="visible">
            <motion.h1 className="text-4xl font-bold tracking-tight text-on-surface sm:text-6xl" variants={itemVariants}>
              {title}
            </motion.h1>
            {subtitle && (
              <motion.p className="mt-6 max-w-md text-lg text-secondary sm:text-xl" variants={itemVariants}>
                {subtitle}
              </motion.p>
            )}
            <motion.div className="mt-8 flex flex-wrap justify-center gap-4 lg:justify-start" variants={itemVariants}>
              {ctaText && (
                <a href={hero.cta_link || '#about'} className="inline-flex items-center justify-center h-11 rounded-md px-8 text-sm font-medium bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-lg">
                  {ctaText}
                </a>
              )}
              <a href="#contact" className="inline-flex items-center justify-center h-11 rounded-md px-8 text-sm font-medium border border-outline bg-surface-container-low text-on-surface hover:bg-surface-container-low/80 transition-colors shadow-lg">
                {t('hero.contactUs')}
              </a>
            </motion.div>
            {stats.length > 0 && (
              <motion.div className="mt-12 flex flex-wrap justify-center gap-8 lg:justify-start" variants={itemVariants}>
                {stats.map((stat, index) => {
                  const Icon = STAT_ICONS[index] || Users;
                  const value = typeof stat.value === 'number' ? stat.value.toLocaleString(lang === 'ar' ? 'ar' : 'en-US') : stat.value;
                  const label = localized(stat.label, lang);
                  return (
                    <div key={index} className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high">
                        <Icon className="h-5 w-5 text-secondary" />
                      </div>
                      <div>
                        <p className="text-xl font-bold text-on-surface">{value}</p>
                        {label && <p className="text-sm text-secondary">{label}</p>}
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </motion.div>

          {/* Right column: image collage */}
          <motion.div className="relative h-[400px] w-full lg:h-[500px]" variants={containerVariants} initial="hidden" animate="visible">
            {/* Decorative shapes */}
            <motion.div className="absolute -top-4 left-1/4 h-16 w-16 rounded-full bg-primary/15" variants={floatingVariants} animate="animate" />
            <motion.div className="absolute bottom-0 right-1/4 h-12 w-12 rounded-lg bg-primary/10" variants={floatingVariants} animate="animate" style={{ transitionDelay: '0.5s' }} />
            <motion.div className="absolute bottom-1/4 left-4 h-6 w-6 rounded-full bg-primary/20" variants={floatingVariants} animate="animate" style={{ transitionDelay: '1s' }} />

            {/* Image 1 — top center */}
            <motion.div className="absolute left-1/2 top-0 h-48 w-48 -translate-x-1/2 rounded-2xl bg-surface-container-high p-2 shadow-lg sm:h-64 sm:w-64" style={{ transformOrigin: 'bottom center' }} variants={imageVariants}>
              <img src={HERO_IMAGES[0]} alt="" className="h-full w-full rounded-xl object-cover" />
            </motion.div>
            {/* Image 2 — right middle */}
            <motion.div className="absolute right-0 top-1/3 h-40 w-40 rounded-2xl bg-surface-container-high p-2 shadow-lg sm:h-56 sm:w-56" style={{ transformOrigin: 'left center' }} variants={imageVariants}>
              <img src={HERO_IMAGES[1]} alt="" className="h-full w-full rounded-xl object-cover" />
            </motion.div>
            {/* Image 3 — bottom left */}
            <motion.div className="absolute bottom-0 left-0 h-32 w-32 rounded-2xl bg-surface-container-high p-2 shadow-lg sm:h-48 sm:w-48" style={{ transformOrigin: 'top right' }} variants={imageVariants}>
              <img src={HERO_IMAGES[2]} alt="" className="h-full w-full rounded-xl object-cover" />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
