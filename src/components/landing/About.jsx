import { Users, Award, GraduationCap, BookOpen, Heart, Target, Quote } from 'lucide-react';
import { useLanding } from '../../context/LandingContext';
import { useLanguage } from '../../context/LanguageContext';
import { localized } from '../../lib/localized';

const STAT_ICONS = { students: Users, teachers: BookOpen, years: GraduationCap, awards: Award };
const STAT_KEYS = ['students', 'teachers', 'years', 'awards'];

export default function About() {
  const { about } = useLanding();
  const { t, lang } = useLanguage();

  return (
    <section id="about" className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 text-center lg:text-start lg:order-1">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display text-on-background">{localized(about.title, lang)}</h2>
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-wider mb-3">
                <Target className="w-4 h-4" /> {t('about.mission')}
              </h3>
              <p className="text-lg text-secondary leading-relaxed">{localized(about.content, lang)}</p>
            </div>
          </div>
          <div className="relative h-[250px] sm:h-[400px] lg:h-[500px] rounded-2xl overflow-hidden bg-gradient-to-br from-primary/10 via-tertiary/5 to-primary-fixed-dim/10 border border-outline-variant shadow-md lg:order-2">
            <img src={about.image_url || '/images/about.jpg'} alt={localized(about.title, lang)} loading="lazy" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent" />
          </div>
        </div>

        {about.vision && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-primary/10 via-tertiary/10 to-primary-fixed-dim/10 border border-outline-variant rounded-xl p-5 md:p-8 relative overflow-hidden">
              <div className="absolute -top-3 -right-3 text-primary/5">
                <Quote className="w-16 h-16 md:w-20 md:h-20" />
              </div>
              <div className="relative">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">{t('about.vision')}</p>
                <p className="text-sm md:text-lg text-on-background leading-relaxed font-medium italic">
                  &ldquo;{localized(about.vision, lang)}&rdquo;
                </p>
              </div>
            </div>
          </div>
        )}

        {about.stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {STAT_KEYS.map((key) => {
              const Icon = STAT_ICONS[key];
              return (
                <div key={key} className="text-center p-4 rounded-xl bg-surface-container-lowest border border-outline-variant">
                  <Icon className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold text-on-background">{about.stats[key]?.toLocaleString()}</p>
                  <p className="text-sm text-secondary">{t(`hero.${key}`)}</p>
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ValueCard icon={GraduationCap} title={t('about.valueAcademic')} desc={t('about.valueAcademicDesc')} />
          <ValueCard icon={Users} title={t('about.valueCommunity')} desc={t('about.valueCommunityDesc')} />
          <ValueCard icon={Heart} title={t('about.valueWellbeing')} desc={t('about.valueWellbeingDesc')} />
          <ValueCard icon={Award} title={t('about.valueInnovation')} desc={t('about.valueInnovationDesc')} />
        </div>
      </div>
    </section>
  );
}

function ValueCard({ icon: Icon, title, desc }) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 sm:p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 text-center group">
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2 sm:mb-3 group-hover:bg-primary/15 group-hover:scale-110 transition-all duration-300">
        <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
      </div>
      <h3 className="font-bold text-on-background text-sm sm:text-base mb-1">{title}</h3>
      <p className="text-xs sm:text-sm text-secondary">{desc}</p>
    </div>
  );
}
