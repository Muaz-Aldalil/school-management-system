import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { Shield, Search, Mail, Key, CheckCircle, Trash2 } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import Reveal from '../../components/Reveal';

export default function ManageUsers() {
  const { user } = useAuth();
  const { isSupervisor } = useSchool();
  const navigate = useNavigate();
  const toast = useToast();
  const { t, lang } = useLanguage();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    if (user?.role !== 'admin' && !isSupervisor) return;
    supabase.from('profiles').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setUsers(data);
      setLoading(false);
    });
  }, [user?.role, isSupervisor]);

  if (user?.role !== 'admin' && !isSupervisor) return <Navigate to="/admin" replace />;

  const approve = async (e, id) => {
    e.stopPropagation();
    const { error } = await supabase.rpc('approve_pending_user', { p_user_id: id });
    if (error) { toast(t('manageUsers.failedToApprove')); return; }
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setUsers(data);
    toast(t('manageUsers.userApproved'));
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleteTarget.id === user?.id) return;
    const { error } = await supabase.rpc('admin_delete_user', { p_user_id: deleteTarget.id });
    setDeleteTarget(null);
    if (error) { toast(t('manageUsers.failedToDelete')); return; }
    setUsers(users.filter(u => u.id !== deleteTarget.id));
    toast(t('manageUsers.userDeleted'));
  };

  const filtered = users.filter(u => {
    if (roleFilter !== 'all' && u.role !== roleFilter && u.metadata?.intended_role !== roleFilter) return false;
    return u.email?.toLowerCase().includes(search.toLowerCase()) || u.name?.toLowerCase().includes(search.toLowerCase());
  });

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (<>
    <div className="p-4 md:p-6 space-y-4">
      <Reveal>
        <div className="flex items-center justify-between gap-4 mb-4">
          <h1 className="text-2xl font-bold text-on-background flex items-center gap-2"><Shield className="w-6 h-6 text-primary" /> {t('manageUsers.title')}</h1>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin/invitations')}
              className="h-10 px-4 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors flex items-center gap-2">
              <Key className="w-4 h-4" /> {t('manageUsers.createInvitation')}
            </button>
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
              className="h-10 rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors">
              <option value="all">{t('manageUsers.allRoles')}</option>
              <option value="pending">{t('common.pending')}</option>
              <option value="admin">{t('common.admin')}</option>
              <option value="teacher">{t('common.teacher')}</option>
              <option value="student">{t('common.student')}</option>
              <option value="parent">{t('common.parent')}</option>
              <option value="accountant">{t('common.accountant')}</option>
              <option value="supervisor">{t('common.supervisor')}</option>
            </select>
            <div className="relative max-w-xs w-full">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
              <input className="w-full h-10 ps-9 pe-3 rounded-lg border border-outline-variant bg-surface text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors" placeholder={t('manageUsers.search')} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>
      </Reveal>
      <Reveal delay={0.05}>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-start">
              <thead>
                <tr className="border-b border-outline-variant text-xs font-semibold text-secondary uppercase bg-surface-container-low/50">
                  <th className="px-4 py-3">{t('common.name')}</th>
                  <th className="px-4 py-3">{t('common.email')}</th>
                  <th className="px-4 py-3">{t('common.phone')}</th>
                  <th className="px-4 py-3">{t('common.role')}</th>
                  <th className="px-4 py-3">{t('common.joined')}</th>
                  <th className="px-4 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-secondary">{t('manageUsers.noUsers')}</td></tr>
                )}
                {filtered.map(u => (
                  <tr key={u.id} onClick={() => navigate(`/admin/users/${u.id}`)}
                    className="border-b border-surface-container-high hover:bg-surface-container-low transition-colors cursor-pointer">
                    <td className="px-4 py-3 font-medium text-on-background">{u.name || '—'}</td>
                    <td className="px-4 py-3 text-secondary flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {u.email}</td>
                    <td className="px-4 py-3 text-secondary">{u.phone || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-lg ${u.role === 'admin' ? 'text-primary bg-primary/10' : u.role === 'pending' ? 'text-warning bg-warning/10' : 'text-secondary bg-surface-container-high'}`}>
                        {u.role === 'pending' && u.metadata?.intended_role ? `pending → ${u.metadata.intended_role}` : u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-secondary text-xs">{u.created_at ? formatDate(u.created_at, lang) : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {u.role === 'pending' && u.metadata?.intended_role && (
                          <button onClick={e => approve(e, u.id)}
                            className="text-xs font-semibold px-3 py-1.5 bg-tertiary text-on-tertiary rounded-lg hover:bg-tertiary-container transition-colors flex items-center gap-1 whitespace-nowrap">
                            <CheckCircle className="w-3.5 h-3.5" /> {t('manageUsers.approve')}
                          </button>
                        )}
                        {user?.role === 'admin' && u.id !== user.id && (
                          <button onClick={e => { e.stopPropagation(); setDeleteTarget(u); }}
                            className="p-1.5 text-secondary hover:text-error transition-colors rounded-lg hover:bg-surface-container-high"
                            title={t('manageUsers.deleteUser')}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>
    </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setDeleteTarget(null)} onKeyDown={e => { if (e.key === 'Escape') setDeleteTarget(null); }} role="presentation">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-xl p-6 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-on-background">{t('manageUsers.deleteTitle')}</h3>
            <p className="text-sm text-secondary">{t('manageUsers.deleteConfirm', { name: deleteTarget.name || deleteTarget.email })}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteTarget(null)}
                className="px-4 h-10 rounded-lg border border-outline-variant text-sm font-semibold text-secondary hover:bg-surface-container-low transition-colors">{t('manageUsers.cancel')}</button>
              <button onClick={confirmDelete}
                className="px-4 h-10 rounded-lg bg-error text-on-primary text-sm font-semibold hover:bg-error/90 transition-colors flex items-center gap-2">
                <Trash2 className="w-4 h-4" /> {t('manageUsers.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
  </>
  );
}
