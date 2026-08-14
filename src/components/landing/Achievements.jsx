import { useState } from 'react';
import { Trophy, Medal, Award, Star, CheckCircle, CalendarDays, Sparkles, ChevronDown } from 'lucide-react';
import { useLanding } from '../../context/LandingContext';
import { useLanguage } from '../../context/LanguageContext';
import { localized } from '../../lib/localized';

const ICONS = [Trophy, Medal, Award, Star, CheckCircle];

function Description({ text, expanded, onToggle }) {
  const { t, lang } = useLanguage();
  const display = localized(text, lang);
  const limit = 150;
  const needsTrunc = display.length > limit;
  const truncated = needsTrunc && !expanded ? display.slice(0, limit) + '...' : display;
  return (
    <>
      <p className="text-sm text-secondary leading-relaxed">{truncated}</p>
      {needsTrunc && (
        <button onClick={onToggle} className="mt-1.5 text-xs font-semibold text-primary flex items-center justify-center gap-1 hover:underline">
          {expanded ? t('achievements.showLess') : t('achievements.readMore')}
          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        </button>
      )}
    </>
  );
}

export default function Achievements() {
  const { achievements } = useLanding();
  const { t, lang } = useLanguage();
  const filtered = achievements.filter(a => a.visible !== false);
  const [expanded, setExpanded] = useState(new Set());
  const toggle = (id) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  if (filtered.length === 0) return null;

  return (
    <section id="achievements" className="relative py-20 bg-background overflow-hidden">
      {/* ponytail: decorative sparkles — static is fine */}
      <div className="pointer-events-none absolute top-10 right-[15%] text-tertiary/20 animate-fade-in"><Sparkles className="w-8 h-8" /></div>
      <div className="pointer-events-none absolute bottom-16 left-[12%] text-primary/15 animate-fade-in"><Star className="w-6 h-6" /></div>
      <div className="pointer-events-none absolute top-1/3 left-[8%] text-yellow-500/15 animate-fade-in"><Star className="w-4 h-4" /></div>
      <div className="pointer-events-none absolute top-1/4 right-[8%] text-secondary/15 animate-fade-in"><Sparkles className="w-5 h-5" /></div>
      <div className="pointer-events-none absolute bottom-1/3 right-[20%] text-tertiary/10 animate-fade-in"><Star className="w-7 h-7" /></div>
      <div className="pointer-events-none absolute top-[60%] left-[5%] text-primary/10 animate-fade-in"><Sparkles className="w-3.5 h-3.5" /></div>
      <div className="pointer-events-none absolute top-[15%] left-[30%] text-yellow-500/10 animate-fade-in"><Star className="w-5 h-5" /></div>
      <div className="pointer-events-none absolute bottom-[10%] right-[5%] text-secondary/10 animate-fade-in"><Sparkles className="w-6 h-6" /></div>

      <div className="relative max-w-5xl mx-auto px-4 md:px-6">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-semibold mb-4">
            <Award className="w-4 h-4" /> {t('achievements.badge')}
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display text-on-background mb-3">{t('achievements.title')}</h2>
          <p className="text-lg text-secondary max-w-2xl mx-auto">{t('achievements.subtitle')}</p>
        </div>

        <div className="relative">
          <div className="space-y-10">
            {filtered.map((a, i) => {
              const Icon = ICONS[i % ICONS.length];
              const d = new Date(a.date);
              const isTop3 = i < 3;
              return (
                <div key={a.id} className="relative md:flex md:gap-6 md:items-center md:justify-center group">
                  <div className={`hidden md:flex z-10 w-[52px] h-[52px] rounded-2xl items-center justify-center shrink-0 ring-4 ring-background transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${
                    i === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-lg shadow-yellow-500/30' :
                    i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white shadow-md' :
                    i === 2 ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md' :
                    'bg-primary/10 text-primary'
                  } ${isTop3 ? 'animate-pulse-slow' : ''}`}>
                    <Icon className="w-5 h-5" />
                    {isTop3 && <span className="absolute -top-1.5 -right-1.5 text-[9px] font-extrabold text-on-primary bg-primary rounded-full w-4 h-4 flex items-center justify-center shadow-sm">{i + 1}</span>}
                  </div>

                  <div className={`relative rounded-xl p-5 md:p-6 pt-10 md:pt-5 w-fit max-w-lg text-center transition-all duration-300 hover:-translate-y-0.5 ${
                    i === 0 ? 'bg-gradient-to-br from-yellow-500/5 via-background to-background border border-yellow-500/20 hover:shadow-lg hover:shadow-yellow-500/10' :
                    'bg-surface-container-lowest/90 backdrop-blur-sm border border-outline-variant/30 hover:shadow-lg'
                  }`}>
                    <div className={`md:hidden absolute left-1/2 -translate-x-1/2 -top-[26px] z-10 w-[52px] h-[52px] rounded-2xl flex items-center justify-center ring-4 ring-background transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${
                      i === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-lg shadow-yellow-500/30' :
                      i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white shadow-md' :
                      i === 2 ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md' :
                      'bg-primary/10 text-primary'
                    } ${isTop3 ? 'animate-pulse-slow' : ''}`}>
                      <Icon className="w-5 h-5" />
                      {isTop3 && <span className="absolute -top-1.5 -right-1.5 text-[9px] font-extrabold text-on-primary bg-primary rounded-full w-4 h-4 flex items-center justify-center shadow-sm">{i + 1}</span>}
                    </div>
                    {i === 0 && <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden"><div className="absolute top-0 right-0 border-[24px] border-transparent border-t-yellow-500 border-r-yellow-500" /></div>}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2 sm:gap-4 mb-3">
                      <h3 className="text-lg font-display text-on-background">{localized(a.title, lang)}</h3>
                      <span className="inline-flex items-center gap-1 text-xs text-secondary bg-surface-container-high px-2.5 py-1 rounded-full shrink-0">
                        <CalendarDays className="w-3 h-3" />
                        {d.toLocaleDateString(lang === 'ar' ? 'ar' : undefined, { year: 'numeric', month: 'short' })}
                      </span>
                    </div>

                    {a.image && (
                      <div className="mb-3 -mx-5 md:-mx-6 -mt-2 rounded-t-xl overflow-hidden h-40">
                        <img src={a.image} alt={localized(a.title, lang)} loading="lazy" className="w-full h-full object-cover" />
                      </div>
                    )}

                    <Description text={a.description} expanded={expanded.has(a.id)} onToggle={() => toggle(a.id)} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
