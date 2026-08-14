import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useSchool } from '../context/SchoolContext';
import { useAuth } from '../context/AuthContext';
import { getScoreLabel, getGradeLabel, formatCurrency } from '../lib/utils';
import { GraduationCap, Award, TrendingUp, CreditCard, Mail, Phone, MapPin, Users, BookOpen, Printer } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import Reveal from '../components/Reveal';
import PasswordChangeForm from '../components/PasswordChangeForm';

export default function StudentDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { students, grades, payments, getStudentIdForUser, fetchStudentPhoto } = useSchool();
  const studentId = getStudentIdForUser(user?.email);
  const student = students.find(s => s.id === studentId);
  const studentGrades = grades.filter(g => g.studentId === studentId);
  const studentPayments = payments.filter(p => p.studentId === studentId);
  const avg = studentGrades.length ? Math.round(studentGrades.reduce((s, g) => s + g.score, 0) / studentGrades.length) : null;
  const best = studentGrades.length ? studentGrades.reduce((a, b) => a.score > b.score ? a : b) : null;

  useEffect(() => { if (studentId && !student?.photo) fetchStudentPhoto(studentId); }, [studentId, student?.photo, fetchStudentPhoto]);

  if (!student) return <p className="text-center text-secondary py-12">{t('studentDashboard.noData')}</p>;

  return (
    <div className="space-y-4">
      <Reveal>
        <header className="flex items-center gap-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-4 md:p-6">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary/30 bg-primary-container flex items-center justify-center text-xl font-bold text-on-primary-container shrink-0">
            {student.photo ? <img src={student.photo} alt={student.name} loading="lazy" className="w-full h-full object-cover" /> : student.name.split(' ')[0]?.[0] || '?'}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-on-background">{student.name}</h1>
            <p className="text-sm text-secondary">{t('studentDashboard.grade')} {getGradeLabel(student.grade)} - {student.class}</p>
            {avg && <p className="text-xs text-primary font-semibold mt-0.5">{t('studentDashboard.avgScore')} {avg}% ({getScoreLabel(avg, t)})</p>}
          </div>
        </header>
      </Reveal>
      <p className="text-xs text-secondary px-1">{t('studentDashboard.help')}</p>

      <Reveal delay={0.05}>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 text-center">
            <BookOpen className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-on-background">{studentGrades.length}</p>
            <p className="text-[10px] text-secondary">{t('studentDashboard.subjects')}</p>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 text-center">
            <TrendingUp className="w-4 h-4 text-tertiary mx-auto mb-1" />
            <p className="text-lg font-bold text-on-background">{avg ? `${avg}%` : '—'}</p>
            <p className="text-[10px] text-secondary">{t('studentDashboard.avgScoreLabel')}</p>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 text-center">
            <Award className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-on-background">{best ? `${best.score}%` : '—'}</p>
            <p className="text-[10px] text-secondary">{t('studentDashboard.best')} {best?.subject || '—'}</p>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 md:p-6">
          <h2 className="text-sm font-bold text-on-background mb-3 flex items-center gap-2"><GraduationCap className="w-4 h-4 text-primary" /> {t('studentDashboard.myGrades')}</h2>
          {studentGrades.length === 0 ? <p className="text-xs text-secondary">{t('studentDashboard.noGrades')}</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-start">
                <thead>
                  <tr className="border-b border-outline-variant text-[11px] font-semibold text-secondary uppercase">
                    <th className="px-2 py-2">{t('studentDashboard.subject')}</th>
                    <th className="px-2 py-2">{t('studentDashboard.score')}</th>
                    <th className="px-2 py-2">{t('studentDetails.grade')}</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {studentGrades.map(g => (
                    <tr key={g.id} className="border-b border-surface-container-high last:border-0 hover:bg-surface-container-low transition-colors">
                      <td className="px-2 py-2.5 font-medium text-on-background">{g.subject}</td>
                      <td className="px-2 py-2.5">{g.score}%</td>
                      <td className="px-2 py-2.5"><span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-semibold">{g.grade}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Reveal>

      <Reveal delay={0.15}>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 md:p-6">
          <h2 className="text-sm font-bold text-on-background mb-3 flex items-center gap-2"><CreditCard className="w-4 h-4 text-primary" /> {t('studentDashboard.myPayments')}</h2>
          {studentPayments.length === 0 ? <p className="text-xs text-secondary">{t('studentDashboard.noPayments')}</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-start">
                <thead>
                  <tr className="border-b border-outline-variant text-[11px] font-semibold text-secondary uppercase">
                    <th className="px-2 py-2">{t('studentDashboard.amount')}</th>
                    <th className="px-2 py-2">{t('studentDashboard.dueDate')}</th>
                    <th className="px-2 py-2">{t('studentDashboard.status')}</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {studentPayments.map(p => (
                    <tr key={p.id} className="border-b border-surface-container-high last:border-0 hover:bg-surface-container-low transition-colors">
                      <td className="px-2 py-2.5 font-medium text-on-background">{formatCurrency(p.amount, 'SDG', t)}</td>
                      <td className="px-2 py-2.5 text-secondary">{p.dueDate}</td>
                      <td className="px-2 py-2.5">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${p.status === 'Paid' ? 'bg-tertiary/10 text-tertiary' : p.status === 'Overdue' ? 'bg-error/10 text-error' : 'bg-secondary/10 text-secondary'}`}>{t('dashboard.' + p.status.toLowerCase())}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Reveal>

      <Reveal delay={0.2}>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 md:p-6">
          <h2 className="text-sm font-bold text-on-background mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> {t('studentDashboard.myInfo')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-secondary"><Mail className="w-3.5 h-3.5" /> {student.email || t('common.na')}</div>
            <div className="flex items-center gap-2 text-secondary"><Phone className="w-3.5 h-3.5" /> {student.phone || t('common.na')}</div>
            <div className="flex items-center gap-2 text-secondary"><MapPin className="w-3.5 h-3.5" /> {t('studentDashboard.grade')} {getGradeLabel(student.grade)} - {student.class}</div>
            <div className="flex items-center gap-2 text-secondary"><Users className="w-3.5 h-3.5" /> {t('studentDashboard.parent')} {student.parent || t('common.na')}</div>
          </div>
        </div>
      </Reveal>
      <Reveal delay={0.25}>
        <Link to="/student/report-card" className="flex items-center gap-2 px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl text-sm font-semibold text-primary hover:bg-surface-container-low transition-colors">
          <Printer className="w-4 h-4" /> {t('studentDashboard.printReportCard')}
        </Link>
      </Reveal>
      <Reveal delay={0.25}>
        <PasswordChangeForm />
      </Reveal>
    </div>
  );
}
