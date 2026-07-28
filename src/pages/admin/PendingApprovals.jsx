import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { Clock, CheckCircle, Search, Mail, Shield } from 'lucide-react';
import Reveal from '../../components/Reveal';

const ROLE_KEYS = ['teacher', 'student', 'parent', 'accountant', 'supervisor'];

export default function PendingApprovals() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useLanguage();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (user?.role !== 'admin' && user?.role !== 'teacher') return;
    const load = async () => {
      const { data: all } = await supabase.from('profiles').select('*').eq('role', 'pending').order('created_at', { ascending: false });
      if (!all) { setLoading(false); return; }

      if (user?.role === 'teacher') {
        const { data: ta } = await supabase.from('teacher_assignments').select('class').eq('teacher_email', user.email);
        const classes = ta?.map(a => a.class) || [];
        setPending(all.filter(p => {
          const m = p.metadata;
          if (!m || !m.intended_role) return false;
          if (m.intended_role === 'student') return classes.includes(m.class);
          if (m.intended_role === 'parent') return (m.children || []).some(c => classes.includes(c.class));
          return false;
        }));
      } else {
        setPending(all.filter(p => p.metadata && p.metadata.intended_role));
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const approve = async (id) => {
    const { error } = await supabase.rpc('approve_pending_user', { p_user_id: id });
    if (error) { toast(t('pendingApprovals.failedToApprove')); return; }
    setPending(pending.filter(p => p.id !== id));
    toast(t('pendingApprovals.approved'));
  };

  const filtered = pending.filter(p =>
    p.email?.toLowerCase().includes(search.toLowerCase()) ||
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <Reveal>
        <div className="flex items-center justify-between gap-4 mb-4">
          <h1 className="text-2xl font-bold text-on-background flex items-center gap-2"><Clock className="w-6 h-6 text-primary" /> {t('pendingApprovals.title')}</h1>
          <div className="relative max-w-xs w-full">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
            <input className="w-full h-10 ps-9 pe-3 rounded-lg border border-outline-variant bg-surface text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors" placeholder={t('pendingApprovals.search')} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </Reveal>

      {filtered.length === 0 && (
        <Reveal delay={0.1}>
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-12 text-center">
            <CheckCircle className="w-12 h-12 text-tertiary mx-auto mb-4" />
            <p className="text-lg font-semibold text-on-background">{t('pendingApprovals.allCaughtUp')}</p>
            <p className="text-sm text-secondary mt-1">{t('pendingApprovals.noPending')}</p>
          </div>
        </Reveal>
      )}

      <div className="space-y-3">
        {filtered.map((p, i) => {
          const m = p.metadata || {};
          return (
            <Reveal key={p.id} delay={i * 0.03}>
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 flex items-center justify-between gap-4 hover:shadow-sm transition-shadow">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-on-background">{p.name || '—'}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-warning/10 text-warning">{t('pendingApprovals.pending')}</span>
                  </div>
                  <p className="text-sm text-secondary flex items-center gap-1"><Mail className="w-3 h-3" />{p.email}</p>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-secondary">
                    <span className="flex items-center gap-1"><Shield className="w-3 h-3" />{t('common.' + m.intended_role) || m.intended_role}</span>
                    {m.class && <span>{t('pendingApprovals.class')} {m.class}</span>}
                    {m.grade && <span>{t('pendingApprovals.grade')} {m.grade}</span>}
                    {(m.children || []).map((c, i) => <span key={i}>{t('pendingApprovals.child')} {i+1}: {c.name} ({c.class})</span>)}
                    {m.classes?.length > 0 && <span>{t('pendingApprovals.classes')} {m.classes.join(', ')}</span>}
                  </div>
                </div>
                <button onClick={() => approve(p.id)}
                  className="shrink-0 h-10 px-5 bg-tertiary text-on-tertiary rounded-lg text-sm font-semibold hover:bg-tertiary-container transition-colors flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> {t('pendingApprovals.approve')}
                </button>
              </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
