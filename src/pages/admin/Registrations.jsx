import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, UserPlus, ChevronDown, ChevronUp, Trash2, CheckCircle, XCircle, RotateCcw, Download, Phone, Mail, X, FileText } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { useLanding } from '../../context/LandingContext';
import { useSchool } from '../../context/SchoolContext';
import { supabase, dbAvailable } from '../../lib/supabase';
import { localized } from '../../lib/localized';
import Reveal from '../../components/Reveal';
import Modal from '../../components/Modal';

export default function Registrations() {
  const { t, lang } = useLanguage();
  const toast = useToast();
  const { registration } = useLanding();
  const { sendNotification } = useSchool();
  const classes = useMemo(() => registration.classes || [], [registration.classes]);

  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [detailTarget, setDetailTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  const fetchRegistrations = useCallback(async () => {
    if (!dbAvailable) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('registration_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setRegistrations(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRegistrations(); }, [fetchRegistrations]);

  const resolveClassName = useCallback((id) => {
    const cls = classes.find(c => c.id === id);
    return cls ? localized(cls.name, lang) : id;
  }, [classes, lang]);

  const filtered = useMemo(() => {
    let list = registrations;
    const q = search.toLowerCase();
    if (q) {
      list = list.filter(r =>
        r.student_name?.toLowerCase().includes(q) ||
        r.parent_name?.toLowerCase().includes(q) ||
        r.phone?.includes(q)
      );
    }
    if (classFilter !== 'all') {
      list = list.filter(r => r.desired_class === classFilter);
    }
    if (statusFilter !== 'all') {
      list = list.filter(r => r.status === statusFilter);
    }
    const sorted = [...list].sort((a, b) => {
      let va = a[sortBy] || '';
      let vb = b[sortBy] || '';
      if (sortBy === 'created_at') { va = new Date(va).getTime(); vb = new Date(vb).getTime(); }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [registrations, search, classFilter, statusFilter, sortBy, sortDir]);

  const stats = useMemo(() => {
    const total = registrations.length;
    const confirmed = registrations.filter(r => r.status === 'confirmed').length;
    const pending = registrations.filter(r => r.status === 'pending').length;
    const cancelled = registrations.filter(r => r.status === 'cancelled').length;
    const perClass = {};
    registrations.filter(r => r.status !== 'cancelled').forEach(r => {
      perClass[r.desired_class] = (perClass[r.desired_class] || 0) + 1;
    });
    return { total, confirmed, pending, cancelled, perClass };
  }, [registrations]);

  const handleStatusChange = useCallback(async (id, newStatus) => {
    if (!dbAvailable) return;
    const { error } = await supabase.from('registration_requests').update({ status: newStatus }).eq('id', id);
    if (error) { toast(t('registrations.failedToUpdate'), 'error'); return; }
    setRegistrations(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    toast(t('registrations.statusUpdated'), 'success');
    if (detailTarget?.id === id) setDetailTarget(prev => ({ ...prev, status: newStatus }));
    const reg = registrations.find(r => r.id === id);
    try { await sendNotification(t('notifications.registrationConfirmed').replace('{name}', reg?.student_name || ''), ['admin']); } catch { /* silent */ }
  }, [t, toast, detailTarget, registrations, sendNotification]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget || !dbAvailable) return;
    const { error } = await supabase.from('registration_requests').delete().eq('id', deleteTarget.id);
    if (error) { toast(t('registrations.failedToDelete'), 'error'); return; }
    setRegistrations(prev => prev.filter(r => r.id !== deleteTarget.id));
    setDeleteTarget(null);
    setDetailTarget(null);
    toast(t('registrations.deleted'), 'success');
    try { await sendNotification(t('notifications.registrationDeleted').replace('{name}', deleteTarget.student_name), ['admin']); } catch { /* silent */ }
  }, [deleteTarget, t, toast, sendNotification]);

  const handleExportCSV = useCallback(() => {
    const headers = ['Student Name', 'Parent Name', 'Phone', 'Email', 'Current Class', 'Desired Class', 'Status', 'Notes', 'Date'];
    const rows = filtered.map(r => [
      r.student_name, r.parent_name, r.phone, r.email || '',
      r.current_class || '', resolveClassName(r.desired_class), r.status || 'confirmed',
      r.notes || '', new Date(r.created_at).toLocaleDateString()
    ]);
    const csv = [headers, ...rows].map(row => row.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `registrations-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast(t('registrations.exported'), 'success');
  }, [filtered, resolveClassName, t, toast]);

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-primary" /> : <ChevronDown className="w-3 h-3 text-primary" />;
  };

  const statusBadge = (status) => {
    const s = status || 'confirmed';
    const styles = {
      confirmed: 'bg-tertiary/10 text-tertiary border border-tertiary/30',
      pending: 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/30',
      cancelled: 'bg-error/10 text-error border border-error/30',
    };
    return (
      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[s] || styles.confirmed}`}>
        {t(`registrations.${s}Lower`)}
      </span>
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <Reveal>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-on-background">{t('registrations.title')}</h1>
              <p className="text-sm text-secondary">{t('registrations.subtitle')}</p>
            </div>
          </div>
          <button onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 h-10 rounded-lg border border-outline-variant text-sm font-semibold text-secondary hover:bg-surface-container-low transition-colors">
            <Download className="w-4 h-4" /> {t('registrations.exportCSV')}
          </button>
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: t('registrations.total'), value: stats.total, color: 'text-on-background' },
            { label: t('registrations.confirmed'), value: stats.confirmed, color: 'text-tertiary' },
            { label: t('registrations.pending'), value: stats.pending, color: 'text-yellow-600' },
            { label: t('registrations.cancelled'), value: stats.cancelled, color: 'text-error' },
          ].map(s => (
            <div key={s.label} className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-4 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-secondary mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t('registrations.search')}
              className="w-full h-10 ps-9 pe-4 rounded-lg border border-outline-variant bg-surface text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors" />
          </div>
          <select value={classFilter} onChange={e => setClassFilter(e.target.value)}
            className="h-10 px-4 rounded-lg border border-outline-variant bg-surface text-sm focus:border-primary transition-colors">
            <option value="all">{t('registrations.allClasses')}</option>
            {classes.map(c => <option key={c.id} value={c.id}>{localized(c.name, lang)}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="h-10 px-4 rounded-lg border border-outline-variant bg-surface text-sm focus:border-primary transition-colors">
            <option value="all">{t('registrations.allStatus')}</option>
            <option value="confirmed">{t('registrations.confirmed')}</option>
            <option value="pending">{t('registrations.pending')}</option>
            <option value="cancelled">{t('registrations.cancelled')}</option>
          </select>
        </div>
      </Reveal>

      <Reveal delay={0.15}>
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="w-12 h-12 text-secondary/30 mx-auto mb-3" />
              <p className="text-secondary">{registrations.length === 0 ? t('registrations.noRegistrations') : t('registrations.noResults')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low">
                    {[['student_name', t('registrations.studentName')], ['parent_name', t('registrations.parentName')], ['phone', t('registrations.phone')],
                      ['desired_class', t('registrations.desiredClass')], ['status', t('registrations.status')], ['created_at', t('registrations.date')]
                    ].map(([col, label]) => (
                      <th key={col} onClick={() => toggleSort(col)}
                        className="text-start px-4 py-3 font-semibold text-secondary cursor-pointer hover:text-on-background transition-colors select-none">
                        <span className="inline-flex items-center gap-1">{label} <SortIcon col={col} /></span>
                      </th>
                    ))}
                    <th className="text-end px-4 py-3 font-semibold text-secondary">{t('registrations.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} onClick={() => setDetailTarget(r)}
                      className="border-b border-outline-variant/50 hover:bg-surface-container-low/50 cursor-pointer transition-colors">
                      <td className="px-4 py-3 font-semibold text-on-background">{r.student_name}</td>
                      <td className="px-4 py-3 text-secondary">{r.parent_name}</td>
                      <td className="px-4 py-3" dir="ltr">
                        <a href={`tel:${r.phone}`} onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1 hover:text-primary transition-colors">
                          <Phone className="w-3 h-3" /> {r.phone}
                        </a>
                      </td>
                      <td className="px-4 py-3">{resolveClassName(r.desired_class)}</td>
                      <td className="px-4 py-3">{statusBadge(r.status)}</td>
                      <td className="px-4 py-3 text-secondary text-xs">{new Date(r.created_at).toLocaleDateString(lang === 'ar' ? 'ar' : 'en-US')}</td>
                      <td className="px-4 py-3 text-end" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {(!r.status || r.status === 'confirmed' || r.status === 'pending') && (
                            <button onClick={() => handleStatusChange(r.id, 'confirmed')}
                              className="p-1.5 text-secondary hover:text-tertiary transition-colors rounded-lg hover:bg-surface-container-high"
                              title={t('registrations.confirm')}>
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          {r.status !== 'cancelled' && (
                            <button onClick={() => handleStatusChange(r.id, 'cancelled')}
                              className="p-1.5 text-secondary hover:text-error transition-colors rounded-lg hover:bg-surface-container-high"
                              title={t('registrations.cancelReg')}>
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                          {r.status === 'cancelled' && (
                            <button onClick={() => handleStatusChange(r.id, 'confirmed')}
                              className="p-1.5 text-secondary hover:text-tertiary transition-colors rounded-lg hover:bg-surface-container-high"
                              title={t('registrations.reconfirm')}>
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => setDeleteTarget(r)}
                            className="p-1.5 text-secondary hover:text-error transition-colors rounded-lg hover:bg-surface-container-high"
                            title={t('common.delete')}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Reveal>

      {detailTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setDetailTarget(null)} onKeyDown={e => { if (e.key === 'Escape') setDetailTarget(null); }} role="presentation">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-outline-variant">
              <h3 className="text-lg font-bold text-on-background">{t('registrations.details')}</h3>
              <button onClick={() => setDetailTarget(null)} aria-label={t('registrations.close')} className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors">
                <X className="w-5 h-5 text-secondary" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  [t('registrations.studentName'), detailTarget.student_name],
                  [t('registrations.parentName'), detailTarget.parent_name],
                  [t('registrations.phone'), <a key="p" href={`tel:${detailTarget.phone}`} className="inline-flex items-center gap-1 text-primary hover:underline" dir="ltr"><Phone className="w-3 h-3" />{detailTarget.phone}</a>],
                  [t('registrations.email'), detailTarget.email ? <a key="e" href={`mailto:${detailTarget.email}`} className="inline-flex items-center gap-1 text-primary hover:underline"><Mail className="w-3 h-3" />{detailTarget.email}</a> : <span key="ne" className="text-secondary">-</span>],
                  [t('registrations.currentClass'), detailTarget.current_class || '-'],
                  [t('registrations.desiredClass'), resolveClassName(detailTarget.desired_class)],
                  [t('registrations.status'), statusBadge(detailTarget.status)],
                  [t('registrations.date'), new Date(detailTarget.created_at).toLocaleDateString(lang === 'ar' ? 'ar' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })],
                ].map(([label, value], i) => (
                  <div key={i}>
                    <div className="text-xs text-secondary mb-1">{label}</div>
                    <div className="text-sm font-medium text-on-background">{value}</div>
                  </div>
                ))}
              </div>
              {detailTarget.notes && (
                <div>
                  <div className="text-xs text-secondary mb-1">{t('registrations.notes')}</div>
                  <div className="text-sm text-on-background bg-surface-container-low rounded-lg p-3">{detailTarget.notes}</div>
                </div>
              )}
              <div className="flex gap-2 pt-2 border-t border-outline-variant">
                {(!detailTarget.status || detailTarget.status === 'pending') && (
                  <button onClick={() => handleStatusChange(detailTarget.id, 'confirmed')}
                    className="flex-1 h-10 rounded-lg bg-tertiary text-on-tertiary text-sm font-semibold hover:bg-tertiary-container transition-colors flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" /> {t('registrations.confirm')}
                  </button>
                )}
                {detailTarget.status !== 'cancelled' && (
                  <button onClick={() => handleStatusChange(detailTarget.id, 'cancelled')}
                    className="flex-1 h-10 rounded-lg border border-error text-error text-sm font-semibold hover:bg-error/10 transition-colors flex items-center justify-center gap-2">
                    <XCircle className="w-4 h-4" /> {t('registrations.cancelReg')}
                  </button>
                )}
                {detailTarget.status === 'cancelled' && (
                  <button onClick={() => handleStatusChange(detailTarget.id, 'confirmed')}
                    className="flex-1 h-10 rounded-lg bg-tertiary text-on-tertiary text-sm font-semibold hover:bg-tertiary-container transition-colors flex items-center justify-center gap-2">
                    <RotateCcw className="w-4 h-4" /> {t('registrations.reconfirm')}
                  </button>
                )}
                <button onClick={() => setDeleteTarget(detailTarget)}
                  className="h-10 px-4 rounded-lg border border-error text-error text-sm font-semibold hover:bg-error/10 transition-colors flex items-center gap-2">
                  <Trash2 className="w-4 h-4" /> {t('common.delete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={t('registrations.deleteTitle')}>
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-secondary">{t('registrations.deleteConfirm', { name: deleteTarget.student_name })}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteTarget(null)}
                className="px-4 h-10 rounded-lg border border-outline-variant text-sm font-semibold text-secondary hover:bg-surface-container-low transition-colors">
                {t('common.cancel')}
              </button>
              <button onClick={handleDelete}
                className="px-4 h-10 rounded-lg bg-error text-on-primary text-sm font-semibold hover:bg-error/90 transition-colors flex items-center gap-2">
                <Trash2 className="w-4 h-4" /> {t('common.delete')}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
