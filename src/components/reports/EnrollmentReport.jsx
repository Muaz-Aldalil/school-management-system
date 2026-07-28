import { useSchool } from '../../context/SchoolContext';
import { useLanguage } from '../../context/LanguageContext';
import { getGradeLabel, getGradeStage, formatDateSD } from '../../lib/utils';

export default function EnrollmentReport() {
  const { t } = useLanguage();
  const { students, schoolInfo } = useSchool();

  const active = students.filter(s => s.status === 'Active');
  const inactive = students.filter(s => s.status === 'Inactive');

  const byGrade = {};
  students.forEach(s => {
    const g = s.grade || '1';
    if (!byGrade[g]) byGrade[g] = { total: 0, active: 0 };
    byGrade[g].total++;
    if (s.status === 'Active') byGrade[g].active++;
  });

  return (
    <div className="space-y-6">
      <div className="text-center border-b-2 border-on-surface pb-4">
        <p className="text-sm text-secondary">{t('ministry.ministryHeader')}</p>
        <h2 className="text-xl font-bold text-on-surface mt-1">{t('ministry.officialReport')}</h2>
        <p className="text-sm font-semibold text-primary mt-1">{t('ministry.enrollment')}</p>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="bg-surface-container-low rounded-lg p-4">
          <p className="text-2xl font-bold text-primary">{students.length}</p>
          <p className="text-xs text-secondary">{t('ministry.totalStudents')}</p>
        </div>
        <div className="bg-surface-container-low rounded-lg p-4">
          <p className="text-2xl font-bold text-tertiary">{active.length}</p>
          <p className="text-xs text-secondary">{t('ministry.activeStudents')}</p>
        </div>
        <div className="bg-surface-container-low rounded-lg p-4">
          <p className="text-2xl font-bold text-error">{inactive.length}</p>
          <p className="text-xs text-secondary">{t('ministry.inactiveStudents')}</p>
        </div>
      </div>

      <div>
        <h3 className="font-bold text-sm mb-2">{t('ministry.byGrade')}</h3>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-surface-container-high">
              <th className="border border-outline-variant px-3 py-2 text-start">{t('common.grade')}</th>
              <th className="border border-outline-variant px-3 py-2 text-center">{t('ministry.totalStudents')}</th>
              <th className="border border-outline-variant px-3 py-2 text-center">{t('ministry.activeStudents')}</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(byGrade).sort((a, b) => Number(a) - Number(b)).map(g => (
              <tr key={g} className="hover:bg-surface-container-low">
                <td className="border border-outline-variant px-3 py-2">{getGradeLabel(g)} ({getGradeStage(g)})</td>
                <td className="border border-outline-variant px-3 py-2 text-center">{byGrade[g].total}</td>
                <td className="border border-outline-variant px-3 py-2 text-center">{byGrade[g].active}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-secondary text-start pt-4 border-t border-outline-variant">
        {t('ministry.generatedBy')} {schoolInfo?.schoolName || t('ministry.alAmiriya')} — {formatDateSD(new Date())}
      </div>
    </div>
  );
}
