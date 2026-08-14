import { useSchool } from '../../context/SchoolContext';
import { useLanguage } from '../../context/LanguageContext';
import { getArabicScore, formatDateSD } from '../../lib/utils';

export default function GradeReport() {
  const { t } = useLanguage();
  const { grades, schoolInfo } = useSchool();

  const scores = grades.filter(g => typeof g.score === 'number');
  const avgScore = scores.length ? Math.round(scores.reduce((s, g) => s + g.score, 0) / scores.length) : 0;
  const passCount = scores.filter(g => g.score >= 50).length;
  const passRate = scores.length ? Math.round((passCount / scores.length) * 100) : 0;

  const gradeKeyMap = { 'ممتاز': 'excellent', 'جيد جداً': 'veryGood', 'جيد': 'good', 'مقبول': 'pass', 'راسب': 'fail' };
  const dist = { excellent: 0, veryGood: 0, good: 0, pass: 0, fail: 0 };
  scores.forEach(g => { const key = gradeKeyMap[getArabicScore(g.score)]; if (key) dist[key]++; });

  const bySubject = {};
  scores.forEach(g => {
    if (!bySubject[g.subject]) bySubject[g.subject] = [];
    bySubject[g.subject].push(g.score);
  });

  return (
    <div className="space-y-6">
      <div className="text-center border-b-2 border-on-surface pb-4">
        <p className="text-sm text-secondary">{t('ministry.ministryHeader')}</p>
        <h2 className="text-xl font-bold text-on-surface mt-1">{t('ministry.officialReport')}</h2>
        <p className="text-sm font-semibold text-primary mt-1">{t('ministry.grades')}</p>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="bg-surface-container-low rounded-lg p-4">
          <p className="text-2xl font-bold text-primary">{scores.length}</p>
          <p className="text-xs text-secondary">{t('ministry.totalStudents')}</p>
        </div>
        <div className="bg-surface-container-low rounded-lg p-4">
          <p className="text-2xl font-bold text-tertiary">{avgScore}%</p>
          <p className="text-xs text-secondary">{t('ministry.avgScore')}</p>
        </div>
        <div className="bg-surface-container-low rounded-lg p-4">
          <p className="text-2xl font-bold text-tertiary">{passRate}%</p>
          <p className="text-xs text-secondary">{t('ministry.passRate')}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <h3 className="font-bold text-sm mb-2">{t('ministry.distribution')}</h3>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-surface-container-high">
              <th className="border border-outline-variant px-3 py-2 text-start">{t('reportCard.gradeLabel')}</th>
              <th className="border border-outline-variant px-3 py-2 text-center">{t('common.score')}</th>
              <th className="border border-outline-variant px-3 py-2 text-center">%</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(dist).map(([label, count]) => (
              <tr key={label} className="hover:bg-surface-container-low">
                <td className="border border-outline-variant px-3 py-2 font-semibold">{t('grades.' + label)}</td>
                <td className="border border-outline-variant px-3 py-2 text-center">{count}</td>
                <td className="border border-outline-variant px-3 py-2 text-center">{scores.length ? Math.round((count / scores.length) * 100) : 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto">
        <h3 className="font-bold text-sm mb-2">{t('common.subject')}</h3>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-surface-container-high">
              <th className="border border-outline-variant px-3 py-2 text-start">{t('common.subject')}</th>
              <th className="border border-outline-variant px-3 py-2 text-center">{t('ministry.totalStudents')}</th>
              <th className="border border-outline-variant px-3 py-2 text-center">{t('ministry.avgScore')}</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(bySubject).sort((a, b) => b[0].localeCompare(a[0])).map(([subject, scores]) => {
              const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
              return (
                <tr key={subject} className="hover:bg-surface-container-low">
                  <td className="border border-outline-variant px-3 py-2">{subject}</td>
                  <td className="border border-outline-variant px-3 py-2 text-center">{scores.length}</td>
                  <td className="border border-outline-variant px-3 py-2 text-center">{avg}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-secondary text-start pt-4 border-t border-outline-variant">
        {t('ministry.generatedBy')} {schoolInfo?.schoolName || t('ministry.alAmiriya')} — {formatDateSD(new Date())}
      </div>
    </div>
  );
}
