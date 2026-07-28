import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { useSchool } from '../../context/SchoolContext';
import { Shield, Key, Copy, CheckCircle, XCircle, Trash2, User, Mail } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import Reveal from '../../components/Reveal';

const ROLES = ['teacher', 'student', 'parent', 'accountant', 'supervisor'];

export default function Invitations() {
  const toast = useToast();
  const { t, lang } = useLanguage();
  const { schoolId } = useSchool();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('teacher');
  const [studentId, setStudentId] = useState(null);
  const [students, setStudents] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [targetName, setTargetName] = useState('');
  const [targetEmail, setTargetEmail] = useState('');

  const load = () => {
    supabase.from('invitations').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setInvitations(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
    supabase.from('students').select('id, name, class').is('deleted_at', null).eq('school_id', schoolId).order('name').then(({ data }) => {
      if (data) setStudents(data);
    });
  }, []);

  const generate = async () => {
    setGenerating(true);
    const meta = (role === 'student' || role === 'parent') && studentId ? { student_id: studentId } : {};
    const { data: code, error } = await supabase.rpc('generate_invitation', {
      p_role: role,
      p_metadata: meta,
      p_target_name: targetName || null,
      p_target_email: targetEmail || null,
    });
    setGenerating(false);
    if (error) { toast(t('invitations.failed')); return; }
    navigator.clipboard?.writeText(code);
    toast(t('invitations.generated', { code }));
    setTargetName('');
    setTargetEmail('');
    setRole('teacher');
    setStudentId(null);
    load();
  };

  const revoke = async (id) => {
    const { error } = await supabase.from('invitations').update({ expires_at: new Date(0).toISOString() }).eq('id', id);
    if (error) { toast(t('invitations.failedRevoke')); return; }
    load();
    toast(t('invitations.revoked'));
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Reveal>
        <header className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-headline-md text-on-background flex items-center gap-2"><Key className="w-6 h-6 text-primary" />{t('invitations.title')}</h2>
            <p className="text-body-md text-secondary mt-1">{t('invitations.subtitle')}</p>
          </div>
        </header>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6">
          <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-4">{t('invitations.createSection')}</h3>
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-48">
              <label className="block text-xs font-semibold text-secondary mb-1"><User className="w-3 h-3 inline me-1" />{t('invitations.name')}</label>
              <input type="text" value={targetName} onChange={e => setTargetName(e.target.value)}
                className="w-full h-10 rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                placeholder={t('invitations.namePlaceholder')} />
            </div>
            <div className="w-56">
              <label className="block text-xs font-semibold text-secondary mb-1"><Mail className="w-3 h-3 inline me-1" />{t('invitations.email')}</label>
              <input type="email" value={targetEmail} onChange={e => setTargetEmail(e.target.value)}
                className="w-full h-10 rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                placeholder={t('invitations.emailPlaceholder')} />
            </div>
            <div className="w-36">
              <label className="block text-xs font-semibold text-secondary mb-1">{t('invitations.role')}</label>
              <select value={role} onChange={e => { setRole(e.target.value); setStudentId(null); }}
                className="w-full h-10 rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors">
                {ROLES.map(r => <option key={r} value={r}>{t('common.' + r)}</option>)}
              </select>
            </div>
            {(role === 'student' || role === 'parent') && (
              <div className="w-56">
                <label className="block text-xs font-semibold text-secondary mb-1">{t('invitations.student')}</label>
                <select value={studentId || ''} onChange={e => setStudentId(e.target.value || null)}
                  className="w-full h-10 rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors">
                  <option value="">{t('invitations.studentSelect')}</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.class})</option>)}
                </select>
              </div>
            )}
            <button onClick={generate} disabled={generating || ((role === 'student' || role === 'parent') && !studentId)}
              className="h-10 px-5 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors disabled:opacity-50 flex items-center gap-2">
              {generating ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Key className="w-4 h-4" /> {t('invitations.generate')}</>}
            </button>
          </div>
          {targetEmail && <p className="text-xs text-secondary mt-3">{t('invitations.codeFor', { email: targetEmail })}</p>}
        </div>
      </Reveal>

      <Reveal delay={0.2}>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-start">
              <thead>
                <tr className="border-b border-outline-variant text-xs font-semibold text-secondary uppercase bg-surface-container-low/50">
                  <th className="px-4 py-3">{t('invitations.for_')}</th>
                  <th className="px-4 py-3">{t('invitations.code')}</th>
                  <th className="px-4 py-3">{t('invitations.role')}</th>
                  <th className="px-4 py-3">{t('invitations.status')}</th>
                  <th className="px-4 py-3">{t('invitations.created')}</th>
                  <th className="px-4 py-3">{t('invitations.expires')}</th>
                  <th className="px-4 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {invitations.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-secondary">{t('invitations.noInvitations')}</td></tr>
                )}
                {invitations.map(inv => {
                  const expired = inv.expires_at && new Date(inv.expires_at) < new Date();
                  const used = inv.used;
                  const active = !used && !expired;
                  return (
                    <tr key={inv.id} className="border-b border-surface-container-high hover:bg-surface-container-low transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-on-background">{inv.target_name || '—'}</div>
                        {inv.target_email && <div className="text-xs text-secondary">{inv.target_email}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-on-background font-medium">{inv.code}</span>
                        <button onClick={() => { navigator.clipboard?.writeText(inv.code); toast(t('invitations.copied')); }}
                          className="ms-2 p-1 text-secondary hover:text-primary transition-colors rounded" title={t('invitations.copyCode')}>
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-secondary capitalize">{inv.role}</td>
                      <td className="px-4 py-3">
                        {used ? <span className="flex items-center gap-1 text-xs text-secondary"><XCircle className="w-3.5 h-3.5" /> {t('invitations.used')}</span>
                          : expired ? <span className="flex items-center gap-1 text-xs text-warning"><XCircle className="w-3.5 h-3.5" /> {t('invitations.expired')}</span>
                          : <span className="flex items-center gap-1 text-xs text-tertiary"><CheckCircle className="w-3.5 h-3.5" /> {t('invitations.active')}</span>}
                      </td>
                      <td className="px-4 py-3 text-secondary text-xs">{formatDate(inv.created_at, lang)}</td>
                      <td className="px-4 py-3 text-secondary text-xs">{inv.expires_at ? formatDate(inv.expires_at, lang) : '—'}</td>
                      <td className="px-4 py-3">
                        {active && (
                          <button onClick={() => revoke(inv.id)}
                            className="text-secondary hover:text-error transition-colors" title={t('invitations.revoke')}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
