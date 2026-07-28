import { useState, useEffect } from 'react';
import { CalendarDays, MapPin, Clock } from 'lucide-react';
import { useLanding } from '../../context/LandingContext';
import { useLanguage } from '../../context/LanguageContext';
import { localized } from '../../lib/localized';

function getMonthLabel(monthIndex, t) {
  const keys = ['months.jan', 'months.feb', 'months.mar', 'months.apr', 'months.may', 'months.jun', 'months.jul', 'months.aug', 'months.sep', 'months.oct', 'months.nov', 'months.dec'];
  return t(keys[monthIndex]);
}

function getStatus(dateStr, t) {
  const now = new Date();
  const d = new Date(dateStr + 'T23:59:59');
  const diff = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
  if (diff < 0) return null;
  if (diff === 0) return { label: t('events.today'), cls: 'bg-tertiary/10 text-tertiary' };
  if (diff === 1) return { label: t('events.tomorrow'), cls: 'bg-primary/10 text-primary' };
  if (diff <= 7) return { label: t('events.thisWeek'), cls: 'bg-secondary/10 text-secondary' };
  return { label: t('events.upcoming'), cls: 'bg-surface-container-high text-secondary' };
}

function calcRemaining(dateStr) {
  const diff = new Date(dateStr + 'T23:59:59') - new Date();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

function Countdown({ date }) {
  const { t } = useLanguage();
  const [remaining, setRemaining] = useState(() => calcRemaining(date));
  useEffect(() => {
    const interval = setInterval(() => setRemaining(calcRemaining(date)), 1000);
    return () => clearInterval(interval);
  }, [date]);
  if (!remaining) return null;
  return (
    <div className="flex items-center gap-1 text-xs font-mono tabular-nums text-primary font-semibold">
      {remaining.days > 0 && <><span className="text-secondary font-normal">{t('events.in')}</span> {remaining.days} {t('countdown.days')}</>}
      <span>{remaining.hours} {t('countdown.hours')}</span>
      <span>{remaining.minutes} {t('countdown.minutes')}</span>
      <span>{remaining.seconds} {t('countdown.seconds')}</span>
    </div>
  );
}

export default function Events() {
  const { events } = useLanding();
  const { t, lang } = useLanguage();
  const filtered = events.filter(e => e.visible !== false);

  if (filtered.length === 0) return null;

  return (
    <section id="events" className="py-20 bg-surface-container-low overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display text-on-background mb-3">{t('events.title')}</h2>
          <p className="text-lg text-secondary max-w-2xl mx-auto">{t('events.subtitle')}</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(event => {
            const d = new Date(event.date);
            const status = getStatus(event.date, t);
            return (
              <div key={event.id} className="bg-surface-container-lowest/90 backdrop-blur-sm border border-outline-variant/30 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 group">
                <div className="relative h-44 bg-gradient-to-br from-primary/10 via-tertiary/5 to-primary/5 flex items-center justify-center overflow-hidden">
                  {event.image ? (
                    <img src={event.image} alt={localized(event.title, lang)} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <CalendarDays className="w-12 h-12 text-primary/20" />
                  )}
                  <div className="absolute top-3 start-3 flex flex-col items-center bg-surface-container-lowest/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm border border-outline-variant/30 min-w-[52px]">
                    <span className="text-[10px] font-semibold uppercase text-secondary tracking-wider leading-tight">{getMonthLabel(d.getMonth(), t)}</span>
                    <span className="text-lg font-bold text-on-background leading-tight">{d.getDate()}</span>
                  </div>
                  {status && (
                    <div className="absolute top-3 end-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${status.cls}`}>{status.label}</span>
                    </div>
                  )}
                </div>
                <div className="p-5 space-y-3">
                  <h3 className="text-lg font-bold text-on-background leading-snug">{localized(event.title, lang)}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-secondary">
                    {event.time && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{event.time}</span>}
                    {event.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{localized(event.location, lang)}</span>}
                  </div>
                  {event.description && (() => { const desc = localized(event.description, lang); return <p className="text-sm text-secondary leading-relaxed">{desc.slice(0, 120)}{desc.length > 120 ? '...' : ''}</p>; })()}
                  <div className="pt-2 border-t border-outline-variant/50 flex items-center justify-between">
                    <Countdown date={event.date} />
                    <span className="text-[10px] text-secondary/50">{d.toLocaleDateString(lang === 'ar' ? 'ar' : undefined, { weekday: 'short' })}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
