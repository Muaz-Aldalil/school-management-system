import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSchool } from '../context/SchoolContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { ChevronRight, Phone, Mail, ArrowLeft, Plus, Edit, Trash2, WifiOff } from 'lucide-react';
import RoleGate from '../components/RoleGate';
import Reveal from '../components/Reveal';
import Modal from '../components/Modal';
import StudentForm from '../components/StudentForm';
import { getSubjectsForGrade, getGradeLabel, getScoreLabel, formatCurrency } from '../lib/utils';

export default function StudentDetails() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { id } = useParams();
  const { students, payments, grades, updateStudent, addGrade, updateGrade, deleteGrade, canEditGrade, getAssignedSubjects, getAssignedClasses, fetchStudentPhoto } = useSchool();
  const student = students.find(s => s.id === id);
  const studentPayments = payments.filter(p => p.studentId === id);
  const studentGrades = grades.filter(g => g.studentId === id);
  const toast = useToast();
  const [editingStudent, setEditingStudent] = useState(null);
  const [showAddGrade, setShowAddGrade] = useState(false);
  const [editingGrade, setEditingGrade] = useState(null);
  const [deletingGrade, setDeletingGrade] = useState(null);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => { if (id && !student?.photo) fetchStudentPhoto(id); }, [id, student?.photo, fetchStudentPhoto]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  if (!student) {
    return (
      <div className="p-6 text-center text-secondary">
        <p className="text-lg">{t('studentDetails.notFound')}</p>
        <Link to="/admin/students" className="text-primary hover:underline mt-2 inline-block">{t('studentDetails.backToStudents')}</Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <Reveal>
        <div className="flex items-center gap-2 text-sm text-on-surface-variant">
          <Link to="/admin/students" className="hover:text-primary transition-colors">{t('sidebar.students')}</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-on-surface font-semibold">{student.name}</span>
        </div>
      </Reveal>
      <Reveal delay={0.1}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <Link to="/admin/students" className="flex items-center gap-2 text-sm text-primary hover:underline">
            <ArrowLeft className="w-4 h-4" /> {t('studentDetails.backToStudents')}
          </Link>
          <div className="flex gap-3">
            <RoleGate roles={['admin']}>
              <button onClick={() => setEditingStudent(student)} className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors">{t('studentDetails.editProfile')}</button>
            </RoleGate>
            <button onClick={() => toast(t('studentDetails.messageComingSoon'))} className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors shadow-sm">{t('studentDetails.message')}</button>
          </div>
        </div>
      </Reveal>
      <Reveal delay={0.15}>
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 relative">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-surface shadow-sm shrink-0 relative">
              {student.photo ? (
                <img src={student.photo} alt={student.name} loading="lazy" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary-container text-on-primary-container flex items-center justify-center text-2xl font-bold">
                  {student.name.split(' ')[0]?.[0] || '?'}
                </div>
              )}
              {student.photo && !online && <span className="absolute bottom-0 end-0 w-6 h-6 bg-surface rounded-full flex items-center justify-center border border-outline-variant shadow-sm"><WifiOff className="w-3.5 h-3.5 text-error" /></span>}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h2 className="text-2xl md:text-3xl font-bold text-on-surface">{student.name}</h2>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${student.status === 'Active' ? 'bg-tertiary/10 text-tertiary border border-tertiary/30' : 'bg-error/10 text-error border border-error/30'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${student.status === 'Active' ? 'bg-tertiary' : 'bg-error'}`} />
                  {t('common.' + student.status.toLowerCase())}
                </span>
              </div>
              <p className="text-base text-secondary mb-2">{t('studentDetails.studentId', { id: String(student.id).padStart(4, '0') })}</p>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-on-surface-variant">
                <span className="flex items-center gap-1">{t('common.grade')} {getGradeLabel(student.grade)} - {student.class}</span>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
      <Reveal delay={0.2}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6">
            <h3 className="text-headline-md text-on-surface mb-4 flex items-center gap-2">{t('studentDetails.personalInfo')}</h3>
            <div className="space-y-3">
              <InfoRow label={t('studentDetails.fullName')} value={student.name} />
              <InfoRow label={t('studentDetails.email')} value={student.email || t('common.na')} />
              <InfoRow label={t('studentDetails.status')} value={t('common.' + student.status.toLowerCase())} />
            </div>
          </div>
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6">
            <h3 className="text-headline-md text-on-surface mb-4 flex items-center gap-2">{t('studentDetails.guardianInfo')}</h3>
            <div className="space-y-3">
              <div className="bg-surface-container-low p-4 rounded-lg border border-surface-container-high">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-outline-variant bg-surface-container-high flex items-center justify-center text-sm font-bold text-secondary shrink-0">
                    {student.parent.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-on-surface">{student.parent}</h4>
                    <p className="text-xs text-secondary mb-2">{t('studentDetails.parent')}</p>
                    <div className="flex flex-col gap-1 text-sm text-on-surface-variant">
                      <span className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {student.phone || t('common.na')}</span>
                      <span className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> {student.email || t('common.na')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
      <Reveal delay={0.25}>
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden">
          <div className="p-4 border-b border-outline-variant flex justify-between items-center">
            <h3 className="text-headline-md text-on-surface">{t('studentDetails.academicGrades')}</h3>
            {canEditGrade(id, '') && <button onClick={() => setShowAddGrade(true)} className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"><Plus className="w-4 h-4" /> {t('studentDetails.addGrade')}</button>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-surface-container-low text-secondary text-xs font-semibold uppercase">
                <tr><th className="px-6 py-3">{t('studentDetails.subject')}</th><th className="px-6 py-3">{t('studentDetails.score')}</th><th className="px-6 py-3">{t('common.grade')}</th><th className="px-6 py-3 text-end">{t('common.actions')}</th></tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high">
                {studentGrades.length === 0 ? (
                  <tr><td colSpan="4" className="px-6 py-8 text-center text-secondary text-sm">{t('studentDetails.noGrades')}</td></tr>
                ) : studentGrades.map(g => (
                  <tr key={g.id} className="hover:bg-surface-bright transition-colors">
                    <td className="px-6 py-3 font-medium">{g.subject}</td>
                    <td className="px-6 py-3">{g.score}</td>
                    <td className="px-6 py-3"><span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">{g.grade}</span></td>
                    <td className="px-6 py-3 text-end">
                      <div className="flex justify-end gap-1">
                        {canEditGrade(id, g.subject) && <button onClick={() => setEditingGrade(g)} className="p-1.5 text-secondary hover:text-primary transition-colors" title={t('students.edit')}><Edit className="w-4 h-4" /></button>}
                        {canEditGrade(id, g.subject) && <button onClick={() => setDeletingGrade(g)} className="p-1.5 text-secondary hover:text-error transition-colors" title={t('students.delete')}><Trash2 className="w-4 h-4" /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>
      <Reveal delay={0.3}>
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden">
          <div className="p-4 border-b border-outline-variant flex justify-between items-center">
            <h3 className="text-headline-md text-on-surface">{t('studentDetails.recentPayments')}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-surface-container-low text-secondary text-xs font-semibold uppercase">
                <tr><th className="px-6 py-3">{t('common.subject')}</th><th className="px-6 py-3">{t('common.amount')}</th><th className="px-6 py-3">{t('common.status')}</th></tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high">
                {studentPayments.length === 0 ? (
                  <tr><td colSpan="3" className="px-6 py-8 text-center text-secondary text-sm">{t('studentDetails.noPayments')}</td></tr>
                ) : studentPayments.map(p => (
                  <tr key={p.id} className="hover:bg-surface-bright transition-colors">
                    <td className="px-6 py-3">{p.dueDate}</td>
                    <td className="px-6 py-3 font-medium">{formatCurrency(p.amount, 'SDG', t)}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.status === 'Paid' ? 'bg-tertiary/10 text-tertiary' : p.status === 'Overdue' ? 'bg-error/10 text-error' : 'bg-secondary/10 text-secondary'}`}>{t('dashboard.' + p.status.toLowerCase())}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>

      <Modal open={!!editingStudent} onClose={() => setEditingStudent(null)} title={t('studentDetails.editTitle')}>
        {editingStudent && (
          <StudentForm student={editingStudent} onSubmit={async data => { try { await updateStudent(editingStudent.id, data); setEditingStudent(null); toast(t('studentDetails.profileUpdated')); } catch (err) { toast(t('studentDetails.failedToUpdate')); } }} onCancel={() => setEditingStudent(null)} />
        )}
      </Modal>
      <Modal open={showAddGrade} onClose={() => setShowAddGrade(false)} title={t('studentDetails.addGradeTitle')}>
        <GradeForm gradeLevel={student.grade} subjects={user?.role === 'teacher' ? getAssignedSubjects() : undefined} onSubmit={async data => { try { await addGrade({ ...data, studentId: student.id }); setShowAddGrade(false); toast(t('studentDetails.gradeAdded')); } catch (err) { toast(t('studentDetails.failedToAddGrade')); } }} onCancel={() => setShowAddGrade(false)} />
      </Modal>
      <Modal open={!!editingGrade} onClose={() => setEditingGrade(null)} title={t('studentDetails.editGradeTitle')}>
        {editingGrade && (
          <GradeForm grade={editingGrade} subjects={user?.role === 'teacher' ? getAssignedSubjects() : undefined} onSubmit={async data => { try { await updateGrade(editingGrade.id, data); setEditingGrade(null); toast(t('studentDetails.gradeUpdated')); } catch (err) { toast(t('studentDetails.failedToUpdateGrade')); } }} onCancel={() => setEditingGrade(null)} />
        )}
      </Modal>
      <Modal open={!!deletingGrade} onClose={() => setDeletingGrade(null)} title={t('studentDetails.deleteGrade', { subject: deletingGrade?.subject || '' })}>
        <div className="space-y-4">
          <p className="text-sm text-secondary">{t('studentDetails.deleteGrade', { subject: deletingGrade?.subject || '' })}</p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeletingGrade(null)} className="px-4 py-2 border border-outline-variant rounded-lg text-sm text-on-surface hover:bg-surface-container-low transition-colors">{t('common.cancel')}</button>
            <button onClick={async () => { try { await deleteGrade(deletingGrade.id); toast(t('studentDetails.gradeDeleted')); } catch (err) { toast(t('studentDetails.failedToDeleteGrade')); } setDeletingGrade(null); }} className="px-4 py-2 bg-error text-on-primary rounded-lg text-sm font-semibold hover:bg-error/90 transition-colors shadow-sm">{t('common.delete')}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-2 border-b border-surface-container-high last:border-0">
      <span className="text-xs text-secondary font-semibold">{label}</span>
      <span className="col-span-2 text-sm text-on-surface">{value}</span>
    </div>
  );
}

function GradeForm({ grade, onSubmit, onCancel, subjects, gradeLevel }) {
  const { t } = useLanguage();
  const allSubjects = getSubjectsForGrade(gradeLevel);
  const [subject, setSubject] = useState(grade?.subject || (subjects?.[0] || allSubjects[0]));
  const [score, setScore] = useState(grade?.score || '');
  const [gradeLetter, setGradeLetter] = useState(grade?.grade || '');

  const GRADE_OPTIONS = [
    { value: t('grades.excellent'), label: t('grades.excellent') },
    { value: t('grades.veryGood'), label: t('grades.veryGood') },
    { value: t('grades.good'), label: t('grades.good') },
    { value: t('grades.pass'), label: t('grades.pass') },
    { value: t('grades.fail'), label: t('grades.fail') },
  ];

  const getAutoGrade = (s) => getScoreLabel(Number(s), t);

  const handleScoreChange = (e) => {
    const val = e.target.value;
    setScore(val);
    if (val) setGradeLetter(getAutoGrade(val));
  };

  const submit = e => {
    e.preventDefault();
    if (!score) return;
    onSubmit({ subject, score: Number(score), grade: gradeLetter || getAutoGrade(score) });
  };

  const options = subjects && subjects.length > 0 ? subjects : allSubjects;

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-secondary mb-1">{t('studentDetails.subject')}</label>
        <select value={subject} onChange={e => setSubject(e.target.value)} className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-primary">
          {options.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-secondary mb-1">{t('studentDetails.score')}</label>
        <input type="number" min="0" max="100" value={score} onChange={handleScoreChange} className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-primary" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-secondary mb-1">{t('studentDetails.grade')}</label>
        <select value={gradeLetter} onChange={e => setGradeLetter(e.target.value)} className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-primary">
          <option value="">{t('studentDetails.selectGrade')}</option>
          {GRADE_OPTIONS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 border border-outline-variant rounded-lg text-sm text-on-surface hover:bg-surface-container-low transition-colors">{t('studentDetails.cancel')}</button>
        <button type="submit" className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors shadow-sm">{grade ? t('studentDetails.update') : t('studentDetails.add')} {t('studentDetails.subject')}</button>
      </div>
    </form>
  );
}
