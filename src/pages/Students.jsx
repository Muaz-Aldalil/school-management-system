import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSchool } from '../context/SchoolContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { Search, Plus, Eye, Edit, Trash2, ArrowUp, ArrowDown, Download, WifiOff } from 'lucide-react';
import { downloadCSV } from '../lib/export';
import { SUDANESE_GRADES, getGradeLabel } from '../lib/utils';
import RoleGate from '../components/RoleGate';
import Reveal from '../components/Reveal';
import Modal from '../components/Modal';
import StudentForm from '../components/StudentForm';
import BulkImport from '../components/BulkImport';
import MigrationRunner from '../components/MigrationRunner';

export default function Students() {
  const { t } = useLanguage();
  const [online, setOnline] = useState(navigator.onLine);
  const { user } = useAuth();
  const { students, grades, addStudent, updateStudent, deleteStudent, canEditStudent, getAssignedClasses, hasMore, loadMore } = useSchool();
  const toast = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const [showAdd, setShowAdd] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [deletingStudent, setDeletingStudent] = useState(null);
  const isTeacher = user?.role === 'teacher';
  const assignedClasses = getAssignedClasses();

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  const gradeAvg = useMemo(() => {
    const map = {};
    grades.forEach(g => {
      if (!map[g.studentId]) map[g.studentId] = [];
      map[g.studentId].push(g.score);
    });
    Object.keys(map).forEach(k => map[k] = Math.round(map[k].reduce((a, b) => a + b, 0) / map[k].length));
    return map;
  }, [grades]);

  const sorted = useMemo(() => {
    let list = students.filter(s => {
      const match = s.name.toLowerCase().includes(search.toLowerCase()) || s.id.toString().includes(search);
      return match && (filter ? s.grade === filter : true) && (statusFilter ? s.status === statusFilter : true);
    });
    if (!sortBy) return list;
    return [...list].sort((a, b) => {
      const va = a[sortBy] || '';
      const vb = b[sortBy] || '';
      const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [students, search, filter, statusFilter, sortBy, sortDir]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <Reveal>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-headline-md text-on-background">{t('students.title')}</h2>
            <p className="text-body-md text-secondary mt-1">{t('students.subtitle')}</p>
          </div>
          <RoleGate roles={['admin', 'teacher', 'supervisor', 'accountant']}>
            <div className="flex items-center gap-2">
              <BulkImport />
              <button onClick={() => downloadCSV(sorted.map(s => ({ name: s.name, class: s.class, grade: s.grade, email: s.email, parent: s.parent, phone: s.phone, status: s.status })), 'students.csv')} className="flex items-center gap-2 border border-outline-variant text-secondary px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-surface-container-low transition-colors">
                <Download className="w-4 h-4" /> {t('students.export')}
              </button>
              <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors shadow-sm">
                <Plus className="w-4 h-4" />
                {t('students.addStudent')}
              </button>
            </div>
          </RoleGate>
        </div>
      </Reveal>
      <MigrationRunner />
      <Reveal delay={0.1}>
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant flex flex-col sm:flex-row gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
            <input className="w-full ps-10 pe-3 py-2 border border-outline-variant rounded-lg text-sm bg-transparent placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary" placeholder={t('students.search')} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="px-3 py-2 border border-outline-variant rounded-lg text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-primary text-on-surface-variant" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="">{t('students.gradeAll')}</option>
            <optgroup label={t('studentForm.stagePrimary')}>
              {SUDANESE_GRADES.filter(g => g.stageEn === 'Primary').map(g => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </optgroup>
            <optgroup label={t('studentForm.stageIntermediate')}>
              {SUDANESE_GRADES.filter(g => g.stageEn === 'Intermediate').map(g => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </optgroup>
          </select>
          <select className="px-3 py-2 border border-outline-variant rounded-lg text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-primary text-on-surface-variant" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">{t('students.statusAll')}</option>
            <option value="Active">{t('common.active')}</option>
            <option value="Inactive">{t('common.inactive')}</option>
          </select>
        </div>
      </Reveal>
      <Reveal delay={0.2}>
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-start">
              <thead className="bg-surface-container-low/50">
                <tr className="text-xs font-semibold text-secondary uppercase tracking-wider">
                  <th className="px-6 py-3 w-16">{t('common.photo')}</th>
                  <th className="px-6 py-3 cursor-pointer select-none" onClick={() => handleSort('name')}>
                    <span className="flex items-center gap-1">{t('common.name')} {sortBy === 'name' ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : null}</span>
                  </th>
                  <th className="px-6 py-3 cursor-pointer select-none" onClick={() => handleSort('grade')}>
                    <span className="flex items-center gap-1">{t('common.grade')} {sortBy === 'grade' ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : null}</span>
                  </th>
                  <th className="px-6 py-3 hidden md:table-cell">{t('studentDashboard.avgScoreLabel')}</th>
                  <th className="px-6 py-3 hidden md:table-cell">{t('studentDetails.guardianInfo')}</th>
                  <th className="px-6 py-3 hidden lg:table-cell">{t('common.phone')}</th>
                  <th className="px-6 py-3">{t('common.status')}</th>
                  <th className="px-6 py-3 text-end">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {sorted.length === 0 ? (
                  <tr><td colSpan="8" className="px-6 py-12 text-center text-secondary text-sm">{t('students.noStudents')} {search || filter || statusFilter ? t('students.trySearch') : t('students.addHint')}</td></tr>
                ) : sorted.map(s => (
                  <tr key={s.id} className="hover:bg-surface-container-low transition-colors cursor-pointer" onClick={() => navigate('/admin/students/' + s.id)}>
                    <td className="px-6 py-4">
                      <div className="relative">
                        {s.photo ? (
                          <img src={s.photo} alt={s.name} loading="lazy" className="w-10 h-10 rounded-full object-cover border border-outline-variant" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-xs font-bold border border-outline-variant">
                            {s.name.split(' ')[0]?.[0] || '?'}
                          </div>
                        )}
                        {s.photo && !online && <span className="absolute -bottom-0.5 -end-0.5 w-3.5 h-3.5 bg-surface rounded-full flex items-center justify-center border border-outline-variant"><WifiOff className="w-2.5 h-2.5 text-error" /></span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-on-background">{s.name}</div>
                      <div className="text-caption-xs text-secondary mt-0.5">{t('common.idPrefix')}{String(s.id).padStart(4, '0')}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">{getGradeLabel(s.grade)}</td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      {gradeAvg[s.id] != null ? (
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${gradeAvg[s.id] >= 85 ? 'bg-tertiary/10 text-tertiary' : gradeAvg[s.id] >= 65 ? 'bg-primary/10 text-primary' : 'bg-error/10 text-error'}`}>{gradeAvg[s.id]}%</span>
                      ) : <span className="text-xs text-secondary">&mdash;</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant hidden md:table-cell">{s.parent}</td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant hidden lg:table-cell">{s.phone}</td>
                    <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.status === 'Active' ? 'bg-tertiary/10 text-tertiary border border-tertiary/30' : 'bg-error/10 text-error border border-error/30'}`}>{t('common.' + s.status.toLowerCase())}</span>
                    </td>
                    <td className="px-6 py-4 text-end">
                      <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()} role="group" aria-label={t('students.actions')}>
                        <button className="p-1.5 text-secondary hover:text-primary transition-colors" title={t('students.view')} onClick={() => navigate('/admin/students/' + s.id)}><Eye className="w-4 h-4" /></button>
                        {canEditStudent(s.id) && <button className="p-1.5 text-secondary hover:text-primary transition-colors" title={t('students.edit')} onClick={() => setEditingStudent(s)}><Edit className="w-4 h-4" /></button>}
                        <RoleGate roles={['admin']}>
                          <button className="p-1.5 text-secondary hover:text-error transition-colors" title={t('students.delete')} onClick={() => setDeletingStudent(s)}><Trash2 className="w-4 h-4" /></button>
                        </RoleGate>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {students.length > 0 && (
            <div className="px-6 py-4 border-t border-outline-variant flex items-center justify-between text-sm text-secondary">
              <span>{t('students.showing', { start: sorted.length, end: students.length, total: students.length })}</span>
              {hasMore && (
                <button onClick={loadMore} className="text-xs font-semibold text-primary hover:text-primary-container transition-colors">
                  {t('students.loadMore') || 'Load More'} ↓
                </button>
              )}
            </div>
          )}
        </div>
      </Reveal>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={t('students.addTitle')}>
        <StudentForm classes={isTeacher ? assignedClasses : undefined} onSubmit={async data => { try { await addStudent(data); setShowAdd(false); toast(t('students.added')); } catch (err) { toast(t('students.failedToAdd') + ': ' + (err?.message || err)); } }} onCancel={() => setShowAdd(false)} />
      </Modal>
      <Modal open={!!editingStudent} onClose={() => setEditingStudent(null)} title={t('students.editTitle')}>
        {editingStudent && <StudentForm student={editingStudent} classes={isTeacher ? assignedClasses : undefined} onSubmit={async data => { try { await updateStudent(editingStudent.id, data); setEditingStudent(null); toast(t('students.updated')); } catch { toast(t('students.failedToUpdate')); } }} onCancel={() => setEditingStudent(null)} />}
      </Modal>
      <Modal open={!!deletingStudent} onClose={() => setDeletingStudent(null)} title={t('students.deleteTitle')}>
        {deletingStudent && (
          <div className="space-y-4">
            <p className="text-sm text-secondary">{t('students.deleteConfirm', { name: deletingStudent.name })}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeletingStudent(null)} className="px-4 py-2 border border-outline-variant rounded-lg text-sm text-on-surface hover:bg-surface-container-low transition-colors">{t('common.cancel')}</button>
              <button onClick={async () => { try { await deleteStudent(deletingStudent.id); setDeletingStudent(null); toast(t('students.deleted')); } catch { toast(t('students.failedToDelete')); } }} className="px-4 py-2 bg-error text-on-primary rounded-lg text-sm font-semibold hover:bg-error/90 transition-colors shadow-sm">{t('common.delete')}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
