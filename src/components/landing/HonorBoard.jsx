import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trophy, Medal, Award, Crown, Star } from 'lucide-react';
import { useLanding } from '../../context/LandingContext';
import { useSchool } from '../../context/SchoolContext';
import { useLanguage } from '../../context/LanguageContext';
import { supabase, dbAvailable } from '../../lib/supabase';
import { DEFAULT_SCHOOL_NAME } from '../../lib/constants';
import { localized } from '../../lib/localized';

const RANKS = [Trophy, Medal, Award];
const BADGES = ['honorRank.first', 'honorRank.second', 'honorRank.third'];

const THEME_KEYS = [
  { icon: 'text-yellow-500', border: 'ring-yellow-400/50', bg: 'bg-yellow-500/10', text: 'text-yellow-600', medalKey: 'honorMedal.gold' },
  { icon: 'text-gray-400', border: 'ring-gray-300/50', bg: 'bg-gray-400/10', text: 'text-gray-500', medalKey: 'honorMedal.silver' },
  { icon: 'text-amber-600', border: 'ring-amber-500/50', bg: 'bg-amber-600/10', text: 'text-amber-700', medalKey: 'honorMedal.bronze' },
];

export default function HonorBoard() {
  const { honorBoard } = useLanding();
  const { students, grades } = useSchool();
  const { t, lang } = useLanguage();

  const [showCongrat, setShowCongrat] = useState(null);

  const allEntries = honorBoard?.entries?.length
    ? honorBoard.entries.slice(0, 10)
    : students.map(s => {
        const g = grades.filter(gr => gr.studentId === s.id);
        const avg = g.length ? Math.round(g.reduce((a, gr) => a + gr.score, 0) / g.length) : 0;
        return { name: s.name, grade: s.grade, class: s.class, score: avg };
      }).sort((a, b) => b.score - a.score).slice(0, 10);
  const podiumEntries = allEntries.slice(0, 3);

  useEffect(() => {
    if (!showCongrat) return;
    const timer = setTimeout(() => setShowCongrat(null), 3000);
    return () => clearTimeout(timer);
  }, [showCongrat]);

  if (allEntries.length === 0) return null;

  const congrat = async (student, rank) => {
    const msg = t('honorBoard.toast', { name: student.name, score: student.score, rank, school: DEFAULT_SCHOOL_NAME });
    try {
      if (dbAvailable) {
        await supabase.from('notifications').insert({
          message: msg,
          student_name: student.name,
          target_roles: ['admin', 'teacher'],
        });
      }
    } catch { /* notification failure is non-critical */ }
    const stored = JSON.parse(localStorage.getItem('honor_congrats') || '[]');
    stored.unshift({ student: student.name, message: msg, at: Date.now() });
    localStorage.setItem('honor_congrats', JSON.stringify(stored.slice(0, 50)));
    setShowCongrat({ student: student.name, rank });
  };

  return (
    <>
    <section id="honor" className="py-20 bg-surface-container-low overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-6 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="text-center mb-12 relative">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display text-on-background mb-3">{t('honorBoard.title')}</h2>
          <p className="text-lg text-secondary max-w-2xl mx-auto">{t('honorBoard.subtitle')}</p>
        </div>

        {/* mobile stacked */}
        <div className="flex flex-col gap-4 md:hidden max-w-sm mx-auto">
          {allEntries.slice(0, 3).map((entry, i) => {
            const theme = THEME_KEYS[i];
            const Icon = RANKS[i] || Award;
            const initials = localized(entry.name, lang).split(' ').map(n => n[0]).join('');

            return (
              <div key={entry.name + '-' + i} className="animate-fade-up">
                <div className={`bg-surface-container-lowest/90 backdrop-blur-sm border border-outline-variant/30 rounded-2xl p-4 text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group ring-2 ${theme.border} ${i === 0 ? 'shadow-xl' : ''}`}>
                  <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-3xl ${i === 0 ? 'bg-yellow-500/10' : i === 1 ? 'bg-gray-400/10' : 'bg-amber-600/10'}`} />
                  {i === 0 && (
                    <div className="absolute top-2 right-2">
                      <Crown className="w-4 h-4 text-yellow-500 animate-pulse-slow" />
                    </div>
                  )}
                  <div className="relative">
                    <div className={`${i === 0 ? 'w-16 h-16' : 'w-14 h-14'} rounded-full mx-auto mb-2 flex items-center justify-center ${theme.bg} ring-2 ${theme.border} group-hover:scale-110 transition-transform duration-300`}>
                      <span className={`${i === 0 ? 'text-lg' : 'text-base'} font-bold ${theme.icon}`}>{initials}</span>
                    </div>
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-surface-container-high mb-2">
                      <Icon className={`w-3 h-3 ${theme.icon}`} />
                      {t(theme.medalKey)}
                    </div>
                    <p className={`${i === 0 ? 'text-lg' : 'text-base'} font-bold text-on-background`}>{localized(entry.name, lang)}</p>
                    <p className="text-xs text-secondary mt-0.5">{t('honorBoard.grade')} {localized(entry.grade, lang)} &middot; {entry.class}</p>
                    <div className={`mt-3 pt-2 border-t border-outline-variant ${theme.bg} -mx-4 px-4 pb-0`}>
                      <div className="flex items-start justify-center gap-0.5">
                        <span className={`${i === 0 ? 'text-2xl' : 'text-xl'} font-bold leading-none ${theme.text || 'text-primary'} drop-shadow-sm`}>{entry.score}</span>
                        <span className="text-xs text-secondary/50 font-medium leading-none mt-1">%</span>
                      </div>
                      <p className="text-[10px] text-secondary/60 mt-0.5">{t('honorBoard.avgScore')}</p>
                    </div>
                    <button onClick={() => congrat(entry, t(BADGES[i]))} className="mt-3 w-full py-2 rounded-xl text-sm font-medium transition-all duration-200 bg-primary/5 hover:bg-primary/10 active:bg-primary/15 text-primary border border-primary/20 hover:border-primary/30">
                      {t('honorBoard.congratulate')}
                    </button>
                    <div className="flex justify-center gap-1 mt-3">
                      {[...Array(3 - i)].map((_, j) => (
                        <Star key={j} className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* desktop podium */}
        <div className="hidden md:flex items-end justify-center gap-6 max-w-5xl mx-auto relative">
          {podiumEntries.map((entry, i) => {
            const theme = THEME_KEYS[i];
            const Icon = RANKS[i] || Award;
            const initials = localized(entry.name, lang).split(' ').map(n => n[0]).join('');
            const isFirst = i === 0;

            return (
              <div key={entry.name + '-' + i}
                className={`w-full ${isFirst ? 'md:w-5/12' : 'md:w-[28%]'} relative ${isFirst ? 'md:order-2 md:-mt-16' : i === 1 ? 'md:order-1 md:mt-12' : 'md:order-3 md:mt-12'} animate-fade-up animate-delay-${i + 1}`}>
                <div className={`bg-surface-container-lowest/90 backdrop-blur-sm border border-outline-variant/30 rounded-2xl ${isFirst ? 'p-6 md:p-8' : 'p-5 md:p-6'} text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group ring-2 ${theme.border} ${isFirst ? 'shadow-xl' : ''}`}>
                  <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-3xl ${isFirst ? 'bg-yellow-500/10' : i === 1 ? 'bg-gray-400/10' : 'bg-amber-600/10'}`} />
                  {isFirst && (
                    <div className="absolute top-3 end-3">
                      <Crown className="w-5 h-5 text-yellow-500 animate-pulse-slow" />
                    </div>
                  )}

                  <div className="relative">
                    <div className={`${isFirst ? 'w-16 h-16 md:w-20 md:h-20' : 'w-14 h-14 md:w-16 md:h-16'} rounded-full mx-auto mb-3 flex items-center justify-center ${theme.bg} ring-2 ${theme.border} group-hover:scale-110 transition-transform duration-300`}>
                      <span className={`${isFirst ? 'text-lg md:text-2xl' : 'text-base md:text-lg'} font-bold ${theme.icon}`}>{initials}</span>
                    </div>

                    <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-surface-container-high mb-3">
                      <Icon className={`w-3.5 h-3.5 ${theme.icon}`} />
                      {t(theme.medalKey)}
                    </div>

                    <p className={`${isFirst ? 'text-xl md:text-2xl' : 'text-lg md:text-xl'} font-bold text-on-background`}>{localized(entry.name, lang)}</p>
                    <p className="text-sm text-secondary mt-0.5">{t('honorBoard.grade')} {localized(entry.grade, lang)} &middot; {entry.class}</p>

                    <div className={`mt-4 pt-3 border-t border-outline-variant ${theme.bg} -mx-6 md:-mx-8 px-6 md:px-8 pb-0`}>
                      <div className="flex items-start justify-center gap-0.5">
                        <span className={`${isFirst ? 'text-3xl md:text-4xl' : 'text-2xl md:text-3xl'} font-bold leading-none ${theme.text || 'text-primary'} drop-shadow-sm`}>{entry.score}</span>
                        <span className="text-xs text-secondary/50 font-medium leading-none mt-1">%</span>
                      </div>
                      <p className="text-xs text-secondary/60 mt-1">{t('honorBoard.avgScore')}</p>
                    </div>

                    <button onClick={() => congrat(entry, t(BADGES[i]))} className="mt-4 w-full py-2.5 rounded-xl text-sm font-medium transition-all duration-200 bg-primary/5 hover:bg-primary/10 active:bg-primary/15 text-primary border border-primary/20 hover:border-primary/30">
                      {t('honorBoard.congratulate')}
                    </button>

                    <div className="flex justify-center gap-1 mt-3">
                      {[...Array(3 - i)].map((_, j) => (
                        <Star key={j} className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </section>
      {showCongrat && createPortal(
        <div className="fixed bottom-6 end-6 z-[999] animate-fade-up" onClick={() => setShowCongrat(null)} onKeyDown={e => { if (e.key === 'Escape') setShowCongrat(null); }} role="presentation">
          <div className="bg-gradient-to-br from-amber-400 via-yellow-500 to-rose-500 rounded-xl px-5 py-4 shadow-[0_0_30px_-10px_rgba(251,191,36,0.4)] flex items-center gap-3 cursor-pointer" onClick={e => e.stopPropagation()}>
            <span className="text-3xl">🎊</span>
            <div>
              <p className="text-white font-semibold text-sm">{showCongrat.student}</p>
              <p className="text-white/80 text-xs">{showCongrat.rank} {t('honorBoard.congratulationsSent')}</p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
