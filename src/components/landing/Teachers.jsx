import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useLanding } from '../../context/LandingContext';
import { useLanguage } from '../../context/LanguageContext';
import { localized } from '../../lib/localized';

const INITIAL = 5;

export default function Teachers() {
  const { teachers } = useLanding();
  const { t, lang } = useLanguage();
  const [showAll, setShowAll] = useState(false);
  const count = teachers.length;
  const displayed = showAll ? teachers : teachers.slice(0, INITIAL);
  const dense = count > 4;

  if (count === 0) return null;

  return (
    <section id="teachers" className="py-20 bg-surface-container-low">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display text-on-background mb-3">{t('teachers.title')}</h2>
          <p className="text-lg text-secondary max-w-2xl mx-auto">{t('teachers.subtitle')}</p>
        </div>
        <div className={`grid gap-6 ${dense ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
          {displayed.map(teacher => (
            <div key={teacher.id} className={`bg-surface-container-lowest/90 backdrop-blur-sm border border-outline-variant/30 rounded-xl text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 group ${dense ? 'p-4' : 'p-6'}`}>
              <div className={`rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-3 group-hover:from-primary/30 group-hover:to-primary/10 transition-all duration-300 shadow-sm ${dense ? 'w-14 h-14' : 'w-20 h-20'}`}>
                {teacher.image ? (
                  <img src={teacher.image} alt={localized(teacher.name, lang)} loading="lazy" className="w-full h-full object-cover object-top" />
                ) : (
                  <span className={`font-bold text-primary ${dense ? 'text-lg' : 'text-2xl'}`}>{localized(teacher.name, lang).split(' ').map(n => n[0]).join('')}</span>
                )}
              </div>
              <h3 className="font-bold text-on-background">{localized(teacher.name, lang)}</h3>
              <p className="text-xs text-primary font-semibold mb-1.5">{localized(teacher.subject, lang)}</p>
              <p className={`text-secondary leading-relaxed ${dense ? 'text-xs line-clamp-2' : 'text-sm'}`}>{localized(teacher.bio, lang)}</p>
            </div>
          ))}
        </div>
        {count > INITIAL && (
          <div className="text-center mt-10">
            <button onClick={() => setShowAll(!showAll)} className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-on-primary rounded-xl text-sm font-semibold hover:bg-primary-container transition-all shadow-lg">
              {showAll ? t('teachers.showLess') : t('teachers.loadMore', { count: count - INITIAL })}
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showAll ? 'rotate-180' : ''}`} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
