import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSchool } from '../context/SchoolContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getArabicScore, formatDate, getGradeLabel } from '../lib/utils';
import { DEFAULT_SCHOOL_NAME } from '../lib/constants';
import { Printer, ArrowLeft } from 'lucide-react';

export default function StudentReportCard() {
  const { user } = useAuth();
  const { students, grades, getStudentIdForUser, schoolInfo } = useSchool();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const printRef = useRef();
  const studentId = getStudentIdForUser(user?.email);
  const student = students.find(s => s.id === studentId);
  const studentGrades = grades.filter(g => g.studentId === studentId);
  const avg = studentGrades.length ? Math.round(studentGrades.reduce((s, g) => s + g.score, 0) / studentGrades.length) : null;

  if (!student) return <p className="text-center text-secondary py-12">{t('reportCard.noData')}</p>;

  return (
    <div>
      <style>{`@media print { body * { visibility: hidden; } #report-card, #report-card * { visibility: visible; } #report-card { position: absolute; left: 0; top: 0; width: 100%; } .no-print { display: none !important; } }`}</style>
      <div className="no-print flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-secondary hover:bg-surface-container-low transition-colors"><ArrowLeft className="w-4 h-4" /></button>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors"><Printer className="w-4 h-4" /> {t('reportCard.print')}</button>
      </div>
      <div id="report-card" ref={printRef} className="bg-white text-black rounded-xl border p-8 max-w-3xl mx-auto shadow-lg" style={{ fontFamily: 'serif' }}>
        <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
          <h1 className="text-2xl font-bold uppercase tracking-wide">{schoolInfo.schoolName || DEFAULT_SCHOOL_NAME}</h1>
          <p className="text-sm text-gray-600">{schoolInfo.schoolAddress || ''}</p>
          <h2 className="text-lg font-semibold mt-3 uppercase tracking-wide">{t('reportCard.title')}</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm mb-6 border-b border-gray-300 pb-4">
          <div><span className="font-semibold">{t('reportCard.student')}</span> {student.name}</div>
          <div><span className="font-semibold">{t('reportCard.grade')}</span> {getGradeLabel(student.grade)}</div>
          <div><span className="font-semibold">{t('reportCard.class')}</span> {student.class}</div>
          <div><span className="font-semibold">{t('reportCard.status')}</span> {student.status}</div>
        </div>
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b-2 border-gray-800">
               <th className="text-start py-2 px-1 font-semibold">{t('reportCard.subject')}</th>
              <th className="text-center py-2 px-1 font-semibold">{t('reportCard.score')}</th>
              <th className="text-center py-2 px-1 font-semibold">{t('reportCard.gradeLabel')}</th>
            </tr>
          </thead>
          <tbody>
            {studentGrades.map(g => (
              <tr key={g.id} className="border-b border-gray-300">
                <td className="py-2 px-1">{g.subject}</td>
                <td className="text-center py-2 px-1">{g.score}%</td>
                <td className="text-center py-2 px-1 font-semibold">{g.grade}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-between items-center pt-2 border-t-2 border-gray-800">
          <p className="text-sm"><span className="font-semibold">{t('reportCard.avgScore')}</span> {avg ? `${avg}% (${getArabicScore(avg)})` : t('common.na')}</p>
          <p className="text-sm"><span className="font-semibold">{t('reportCard.subjectsEnrolled')}</span> {studentGrades.length}</p>
        </div>
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>{t('reportCard.generated', { date: formatDate(new Date(), lang) })}</p>
        </div>
      </div>
    </div>
  );
}
