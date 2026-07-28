import { useMemo, useState, useEffect } from 'react';
import { useSchool } from '../context/SchoolContext';
import { useAuth } from '../context/AuthContext';
import { getScoreLabel, getGradeLabel, formatCurrency } from '../lib/utils';
import { Mail, Phone, MapPin, GraduationCap, Award, CreditCard, ChevronDown } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import Reveal from '../components/Reveal';

export default function ParentDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { students, payments, grades, parentLinks, fetchStudentPhoto } = useSchool();

  const childIds = useMemo(() => {
    const links = parentLinks[user?.email];
    return Array.isArray(links) ? links : links ? [links] : [];
  }, [parentLinks, user?.email]);

  const childStudents = useMemo(
    () => childIds.map(id => students.find(s => s.id === id)).filter(Boolean),
    [childIds, students]
  );

  const [selectedId, setSelectedId] = useState(() => childStudents[0]?.id || null);
  const student = childStudents.find(s => s.id === selectedId) || childStudents[0];

  const studentPayments = useMemo(
    () => student ? payments.filter(p => p.studentId === student.id) : [],
    [payments, student]
  );
  const studentGrades = useMemo(
    () => student ? grades.filter(g => g.studentId === student.id) : [],
    [grades, student]
  );
  const avg = studentGrades.length ? Math.round(studentGrades.reduce((s, g) => s + g.score, 0) / studentGrades.length) : null;

  useEffect(() => { if (student?.id && !student.photo) fetchStudentPhoto(student.id); }, [student?.id, student?.photo, fetchStudentPhoto]);

  if (!student) return <p className="text-center text-secondary py-12">{t('parentDashboard.noData')}</p>;

  return (
    <div className="space-y-6">
      {childStudents.length > 1 && (
        <Reveal>
          <div className="relative">
            <label className="text-xs font-semibold text-secondary uppercase tracking-wide mb-1 block">{t('parentDashboard.selectChild')}</label>
            <div className="relative">
              <select
                value={selectedId || ''}
                onChange={e => setSelectedId(e.target.value)}
                className="w-full appearance-none bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 text-sm font-semibold text-on-surface focus:outline-none focus:border-primary cursor-pointer"
              >
                {childStudents.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {getGradeLabel(c.grade)} {c.class ? `(${c.class})` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary pointer-events-none" />
            </div>
          </div>
        </Reveal>
      )}

      <Reveal delay={0.05}>
        <header className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary/30 bg-primary-container flex items-center justify-center text-xl font-bold text-on-primary-container shrink-0">
            {student.photo ? <img src={student.photo} alt={student.name} loading="lazy" className="w-full h-full object-cover" /> : (student.name || '').split(' ')[0]?.[0] || '?'}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-on-background">{student.name}</h1>
            <p className="text-sm text-secondary">{t('parentDashboard.grade')} {getGradeLabel(student.grade)} - {student.class}</p>
            {avg && <p className="text-xs text-primary font-semibold mt-0.5">{t('parentDashboard.avgScore')} {avg}% ({getScoreLabel(avg, t)})</p>}
          </div>
        </header>
      </Reveal>
      <p className="text-xs text-secondary px-1">{t('parentDashboard.help')}</p>

      <Reveal delay={0.1}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4">
            <h2 className="text-sm font-semibold text-on-background mb-3 flex items-center gap-2"><GraduationCap className="w-4 h-4 text-primary" /> {t('parentDashboard.academicGrades')}</h2>
            {studentGrades.length === 0 ? <p className="text-xs text-secondary">{t('parentDashboard.noGrades')}</p> : (
              <div className="space-y-2">
                {studentGrades.map(g => (
                  <div key={g.id} className="flex justify-between items-center py-1.5 border-b border-surface-container-high last:border-0">
                    <span className="text-sm text-on-surface">{g.subject}</span>
                    <span className="text-xs font-semibold flex items-center gap-2">{g.score}% <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px]">{g.grade}</span></span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4">
            <h2 className="text-sm font-semibold text-on-background mb-3 flex items-center gap-2"><CreditCard className="w-4 h-4 text-primary" /> {t('parentDashboard.paymentHistory')}</h2>
            {studentPayments.length === 0 ? <p className="text-xs text-secondary">{t('parentDashboard.noPayments')}</p> : (
              <div className="space-y-2">
                {studentPayments.map(p => (
                  <div key={p.id} className="flex justify-between items-center py-1.5 border-b border-surface-container-high last:border-0">
                    <div>
                      <span className="text-sm text-on-surface">{formatCurrency(p.amount, 'SDG', t)}</span>
                      <span className="text-[10px] text-secondary ms-2">{p.dueDate}</span>
                    </div>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${p.status === 'Paid' ? 'bg-tertiary/10 text-tertiary' : p.status === 'Overdue' ? 'bg-error/10 text-error' : 'bg-secondary/10 text-secondary'}`}>{t('dashboard.' + p.status.toLowerCase())}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.2}>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4">
          <h2 className="text-sm font-semibold text-on-background mb-3 flex items-center gap-2"><Award className="w-4 h-4 text-primary" /> {t('parentDashboard.schoolInfo')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-secondary"><Mail className="w-3.5 h-3.5" /> {student.email || t('common.na')}</div>
            <div className="flex items-center gap-2 text-secondary"><Phone className="w-3.5 h-3.5" /> {student.phone || t('common.na')}</div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
