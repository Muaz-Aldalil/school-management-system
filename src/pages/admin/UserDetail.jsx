import { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { ArrowLeft, Save, Mail, Phone, Calendar, Shield, Trash2, Plus, CheckCircle } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import Reveal from '../../components/Reveal';

const ROLES = ['admin', 'teacher', 'parent', 'student', 'accountant', 'supervisor', 'pending'];

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { isSupervisor } = useSchool();
  const { t, lang } = useLanguage();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [studentLinks, setStudentLinks] = useState([]);
  const [newClass, setNewClass] = useState('');

  useEffect(() => {
    if (user?.role !== 'admin' && !isSupervisor) return;
    const load = async () => {
      const { data: p } = await supabase.from('profiles').select('id, name, email, phone, role, school_id, created_at').eq('id', id).single();
      if (!p) { navigate('/admin/users'); return; }
      setProfile(p);

      if (p.role === 'teacher') {
        const { data: ta } = await supabase.from('teacher_assignments').select('*').eq('teacher_email', p.email).order('class');
        if (ta) setAssignments(ta);
      }
      if (p.role === 'student' || p.role === 'parent') {
        const { data: links } = await supabase.from('user_student_links')
          .select('*, students!student_id(name, class, grade)').eq('user_email', p.email);
        if (links) setStudentLinks(links);
      }
      setLoading(false);
    };
    load();
  }, [id, user?.role, isSupervisor, navigate]);

  if (user?.role !== 'admin' && !isSupervisor) return <Navigate to="/admin" replace />;

  const saveProfile = async () => {
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ name: profile.name, email: profile.email, phone: profile.phone, role: profile.role }).eq('id', id);
    setSaving(false);
    if (error) { toast(t('userDetail.failedToSave')); return; }
    toast(t('userDetail.updated'));
  };

  const approve = async () => {
    setApproving(true);
    const { error } = await supabase.rpc('approve_pending_user', { p_user_id: id });
    setApproving(false);
    if (error) { toast(t('userDetail.failedToApprove')); return; }
    const { data: p } = await supabase.from('profiles').select('id, name, email, phone, role, school_id, created_at').eq('id', id).single();
    if (p) setProfile(p);
    toast(t('userDetail.userApproved'));
  };

  const addClass = async () => {
    if (!newClass.trim()) return;
    const { data, error } = await supabase.from('teacher_assignments').insert({ teacher_email: profile.email, class: newClass.trim() }).select().single();
    if (error) { toast(t('userDetail.failedToAddClass')); return; }
    if (data) setAssignments([...assignments, data]);
    setNewClass('');
  };

  const removeClass = async (aid) => {
    const { error } = await supabase.from('teacher_assignments').delete().eq('id', aid);
    if (error) { toast(t('userDetail.failedToRemoveClass')); return; }
    setAssignments(assignments.filter(a => a.id !== aid));
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!profile) return null;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <button onClick={() => navigate('/admin/users')} className="flex items-center gap-1.5 text-sm text-secondary hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4" /> {t('userDetail.backToUsers')}
      </button>

      <Reveal>
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-headline-md text-on-background">{profile.name || t('common.student')}</h2>
            <button onClick={saveProfile} disabled={saving}
              className="flex items-center gap-2 px-5 h-10 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors disabled:opacity-50">
              <Save className="w-4 h-4" /> {saving ? t('userDetail.saving') : t('userDetail.save')}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">{t('userDetail.nameLabel')}</label>
              <input type="text" value={profile.name || ''} onChange={e => setProfile({ ...profile, name: e.target.value })}
                className="w-full h-10 rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1"><Mail className="w-3 h-3 inline me-1" />{t('common.email')}</label>
              <input type="email" value={profile.email || ''} onChange={e => setProfile({ ...profile, email: e.target.value })}
                className="w-full h-10 rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1"><Phone className="w-3 h-3 inline me-1" />{t('common.phone')}</label>
              <input type="tel" value={profile.phone || ''} onChange={e => setProfile({ ...profile, phone: e.target.value })}
                className="w-full h-10 rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1"><Shield className="w-3 h-3 inline me-1" />{t('common.role')}</label>
              {user?.role === 'admin' ? (
                <select value={profile.role} onChange={e => setProfile({ ...profile, role: e.target.value })}
                  className="w-full h-10 rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors">
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              ) : (
                <div className="w-full h-10 flex items-center px-3 rounded-lg border border-outline-variant bg-surface-container-high text-sm text-secondary">{profile.role}</div>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1"><Calendar className="w-3 h-3 inline me-1" />{t('common.joined')}</label>
              <div className="w-full h-10 flex items-center px-3 rounded-lg border border-outline-variant bg-surface-container-high text-sm text-secondary">
                {profile.created_at ? formatDate(profile.created_at, lang) : '—'}
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {profile.role === 'pending' && profile.metadata?.intended_role && (
        <Reveal delay={0.1}>
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6">
            <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-4">{t('userDetail.pendingApproval')}</h3>
            <div className="bg-surface-container-high rounded-lg p-4 mb-4 space-y-1 text-sm">
              <p><span className="text-secondary">{t('userDetail.intendedRole')}</span> {profile.metadata.intended_role}</p>
              {profile.metadata.class && <p><span className="text-secondary">{t('userDetail.class')}</span> {profile.metadata.class}</p>}
              {profile.metadata.grade && <p><span className="text-secondary">{t('userDetail.grade')}</span> {profile.metadata.grade}</p>}
              {(profile.metadata.children || []).map((c, i) => <p key={i}><span className="text-secondary">{t('userDetail.child')} {i+1}:</span> {c.name} ({c.class})</p>)}
              {profile.metadata.classes?.length > 0 && <p><span className="text-secondary">{t('userDetail.classes')}</span> {profile.metadata.classes.join(', ')}</p>}
            </div>
            <button onClick={approve} disabled={approving}
              className="h-10 px-5 bg-tertiary text-on-tertiary rounded-lg text-sm font-semibold hover:bg-tertiary-container transition-colors disabled:opacity-50 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> {approving ? t('userDetail.approving') : t('userDetail.approve')}
            </button>
          </div>
        </Reveal>
      )}

      {profile.role === 'teacher' && (
        <Reveal delay={0.1}>
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6">
            <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-4">{t('userDetail.assignedClasses')}</h3>
            <div className="flex gap-2 mb-4">
              <input type="text" value={newClass} onChange={e => setNewClass(e.target.value)}
                placeholder={t('userDetail.classPlaceholder')}
                className="w-40 h-10 rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                onKeyDown={e => e.key === 'Enter' && addClass()} />
              <button onClick={addClass} disabled={!newClass.trim()}
                className="h-10 px-4 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors disabled:opacity-50 flex items-center gap-1">
                <Plus className="w-4 h-4" /> {t('userDetail.add')}
              </button>
            </div>
            {assignments.length === 0 && <p className="text-sm text-secondary">{t('userDetail.noClasses')}</p>}
            <div className="flex flex-wrap gap-2">
              {assignments.map(a => (
                <div key={a.id} className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-high rounded-lg text-sm">
                  {a.class}
                  <button onClick={() => removeClass(a.id)} className="text-secondary hover:text-error transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      )}

      {(profile.role === 'student' || profile.role === 'parent') && studentLinks.length > 0 && (
        <Reveal delay={0.1}>
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6">
            <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-4">{profile.role === 'parent' ? t('userDetail.linkedChildren') : t('userDetail.linkedStudent')}</h3>
            {studentLinks.map(link => (
              <div key={link.id} className="text-sm space-y-1">
                <p><span className="text-secondary">{t('userDetail.nameLabel')}</span> {link.students?.name}</p>
                <p><span className="text-secondary">{t('userDetail.classLabel')}</span> {link.students?.class}</p>
                {profile.role === 'student' && <p><span className="text-secondary">{t('userDetail.gradeLabel')}</span> {link.students?.grade}</p>}
              </div>
            ))}
          </div>
        </Reveal>
      )}
    </div>
  );
}
