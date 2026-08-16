import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { School, LogIn, UserPlus, Eye, EyeOff, Timer, User, Phone, Shield, Plus, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { DEFAULT_SCHOOL_NAME } from '../lib/constants';
import { supabase } from '../lib/supabase';
import { useRateLimit } from '../hooks/useRateLimit';
import SEO from '../components/SEO';

const ROLES = ['teacher', 'student', 'parent', 'accountant', 'supervisor'];

export default function Login() {
  const { user, signIn, signUp, resetPassword, signInWithGoogle, error, setError, refreshProfile, profile } = useAuth();
  const { t } = useLanguage();
  const { blocked, recordFailure, reset } = useRateLimit();
  const navigate = useNavigate();

  const [tab, setTab] = useState('signin');
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', phone: '', role: '', serial: '', classList: [''], studentClass: '', studentGrade: '', children: [{ name: '', class: '' }] });
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [serialState, setSerialState] = useState('idle');
  const [serialRole, setSerialRole] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  const [showForgot, setShowForgot] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const isPending = user && user.role === 'pending';

  const roleHome = (role) => (role === 'parent' ? '/parent' : role === 'student' ? '/student' : '/admin');

  useEffect(() => {
    if (!form.serial || form.serial.length < 5) { setSerialState('idle'); return; }
    const t = setTimeout(async () => {
      try {
        const { data } = await supabase.rpc('check_invitation', { p_code: form.serial.trim(), p_email: form.email || null });
        if (!data?.[0]?.valid) { setSerialState('invalid'); return; }
        setSerialState('valid');
        setSerialRole(data[0].role);
      } catch { setSerialState('invalid'); }
    }, 400);
    return () => clearTimeout(t);
  }, [form.serial, form.email]);

  useEffect(() => {
    if (serialState === 'valid' && serialRole && serialRole !== form.role) {
      setSerialState('mismatch');
    } else if (serialState === 'mismatch' && serialRole === form.role) {
      setSerialState('valid');
    }
  }, [form.role, serialState, serialRole]);

  useEffect(() => {
    if (isPending && profile) {
      const m = profile.metadata || {};
      setForm(f => ({
        ...f,
        name: profile.name || '',
        email: user.email || '',
        phone: profile.phone || m.phone || '',
        role: m.intended_role || '',
        classList: Array.isArray(m.classes) && m.classes.length ? m.classes : [''],
        studentClass: m.class || '',
        studentGrade: m.grade || '',
        children: Array.isArray(m.children) && m.children.length ? m.children : [{ name: '', class: '' }],
      }));
    }
  }, [isPending, profile, user]);

  if (user && user.role !== 'pending') {
    return <Navigate to={roleHome(user.role)} replace />;
  }

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (blocked) return;
    setSubmitting(true); setError(null);
    const ok = await signIn(form.email, form.password);
    setSubmitting(false);
    if (ok) reset();
    else recordFailure();
  };

  const submitWithMetadata = async (userId) => {
    if (serialState === 'valid') {
      const roleData = {};
      if (form.role === 'teacher') roleData.classes = form.classList.filter(Boolean);
      const { error: e } = await supabase.rpc('complete_registration', {
        p_code: form.serial.trim(), p_name: form.name, p_phone: form.phone, p_selected_role: form.role, p_role_data: roleData,
      });
      if (e) { setError('Registration failed. Please try again.'); return false; }
      await refreshProfile();
      return true;
    }
    const meta = { intended_role: form.role };
    if (form.role === 'teacher') meta.classes = form.classList.filter(Boolean);
    if (form.role === 'student') { meta.class = form.studentClass; meta.grade = form.studentGrade; }
    if (form.role === 'parent') { meta.children = form.children?.filter(c => c.name.trim()); }
    const { error: e } = await supabase.from('profiles').update({ name: form.name, phone: form.phone, metadata: meta }).eq('id', userId);
    if (e) { setError('Registration failed. Please try again.'); return false; }
    await refreshProfile();
    return true;
  };

  const signupMeta = () => {
    const meta = {
      name: form.name,
      role: form.role,
      phone: form.phone,
      serial: form.serial?.trim() || null,
    };
    if (form.role === 'teacher') meta.classes = form.classList.filter(Boolean);
    if (form.role === 'student') { meta.class = form.studentClass; meta.grade = form.studentGrade; }
    if (form.role === 'parent') meta.children = form.children?.filter(c => c.name.trim());
    return meta;
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!form.role || submitting) return;
    if (form.role === 'teacher' && serialState !== 'valid') { setError(t('auth.teacherNeedsCode')); return; }
    if (form.role === 'parent' && !form.children?.some(c => c.name.trim())) { setError(t('auth.childRequired')); return; }
    if (form.password !== form.confirmPassword) { setError(t('auth.passwordsDontMatch')); return; }
    setSubmitting(true); setError(null); setCheckEmail(false);
    const res = await signUp(form.email, form.password, signupMeta());
    if (!res) { setSubmitting(false); return; }
    const userData = res.user;
    if (!userData) { setSubmitting(false); return; }

    if (!res.session) {
      // Email confirmation is enabled: account exists, role is resolved server-side
      // by the handle_new_user trigger. Ask the user to confirm their email.
      setSubmitting(false);
      reset();
      setCheckEmail(true);
      return;
    }

    // Autoconfirm mode: a session exists immediately. The trigger already set the
    // profile role from the invitation code (or left it pending), so just confirm
    // it and route accordingly.
    for (let i = 0; i < 8; i++) {
      const { data: p } = await supabase.from('profiles').select('role').eq('id', userData.id).single();
      if (p) {
        if (p.role !== 'pending') {
          setSubmitting(false);
          navigate(roleHome(p.role), { replace: true });
          return;
        }
        break;
      }
      await new Promise(r => setTimeout(r, 250));
    }
    setSubmitting(false);
    reset();
    setShowApprovalModal(true);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!form.email.trim()) { setError(t('auth.enterEmail')); return; }
    const ok = await resetPassword(form.email);
    if (ok) setResetSent(true);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true); setError(null);
    await signInWithGoogle();
    setGoogleLoading(false);
  };

  const handleComplete = async (e) => {
    e.preventDefault();
    if (!form.role || submitting) return;
    if (form.role === 'teacher' && serialState !== 'valid') { setError(t('auth.teacherNeedsCode')); return; }
    if (form.role === 'parent' && !form.children?.some(c => c.name.trim())) { setError(t('auth.childRequired')); return; }
    setSubmitting(true); setError(null);
    const ok = await submitWithMetadata(user.id);
    setSubmitting(false);
    if (!ok) return;
    reset();
    if (serialState === 'valid') {
      navigate(form.role === 'parent' ? '/parent' : form.role === 'student' ? '/student' : '/admin', { replace: true });
    } else {
      setShowApprovalModal(true);
    }
  };

  const roleFields = () => (
    <>
      {form.role === 'teacher' && (
        <div>
          <label className="block text-sm font-semibold text-on-surface-variant mb-2">{t('auth.classes')} <span className="text-error">*</span></label>
          <div className="space-y-2">
            {(form.classList || ['']).map((cls, i) => (
              <div key={i} className="flex gap-2">
                <input type="text" value={cls} onChange={e => { const c = [...form.classList]; c[i] = e.target.value; set('classList', c); }}
                  className="flex-1 h-10 rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors" placeholder={t('auth.classPlaceholder')} />
                <button type="button" onClick={() => set('classList', form.classList.filter((_, j) => j !== i))}
                  className="h-10 w-10 flex items-center justify-center text-secondary hover:text-error transition-colors rounded-lg hover:bg-surface-container-low">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => set('classList', [...(form.classList || []), ''])}
            className="mt-2 text-sm text-primary hover:underline flex items-center gap-1">
            <Plus className="w-4 h-4" /> {t('auth.addClass')}
          </button>
        </div>
      )}
      {form.role === 'student' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-on-surface-variant mb-1.5">{t('auth.class')}</label>
            <input type="text" value={form.studentClass} onChange={e => set('studentClass', e.target.value)}
              className="w-full h-11 rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors" placeholder={t('auth.classPlaceholder')} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-on-surface-variant mb-1.5">{t('auth.grade')}</label>
            <input type="text" value={form.studentGrade} onChange={e => set('studentGrade', e.target.value)}
              className="w-full h-11 rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors" placeholder={t('auth.gradePlaceholder')} />
          </div>
        </div>
      )}
      {form.role === 'parent' && (
        <div>
          <label className="block text-sm font-semibold text-on-surface-variant mb-2">{t('auth.children')} <span className="text-error">*</span></label>
          <div className="space-y-2">
            {(form.children || []).map((child, i) => (
              <div key={i} className="flex gap-2">
                <input type="text" value={child.name} onChange={e => { const c = [...form.children]; c[i] = { ...c[i], name: e.target.value }; set('children', c); }}
                  className="flex-1 h-10 rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors" placeholder={t('auth.childNamePlaceholder')} />
                <input type="text" value={child.class} onChange={e => { const c = [...form.children]; c[i] = { ...c[i], class: e.target.value }; set('children', c); }}
                  className="w-24 h-10 rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors" placeholder={t('auth.childClassPlaceholder')} />
                <button type="button" onClick={() => set('children', form.children.filter((_, j) => j !== i))}
                  className="h-10 w-10 flex items-center justify-center text-secondary hover:text-error transition-colors rounded-lg hover:bg-surface-container-low">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => set('children', [...(form.children || []), { name: '', class: '' }])}
            className="mt-2 text-sm text-primary hover:underline flex items-center gap-1">
            <Plus className="w-4 h-4" /> {t('auth.addChild')}
          </button>
        </div>
      )}
    </>
  );

  const commonFields = (includePassword) => (
    <>
      <div>
        <label className="block text-sm font-semibold text-on-surface-variant mb-1.5" htmlFor="name"><User className="w-3.5 h-3.5 inline me-1" />{t('auth.fullName')}</label>
        <input id="name" type="text" value={form.name} onChange={e => set('name', e.target.value)}
          className="w-full h-11 rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors" required />
      </div>
      <div>
        <label className="block text-sm font-semibold text-on-surface-variant mb-1.5" htmlFor="email">{t('auth.email')}</label>
        <input id="email" type="email" value={form.email} onChange={e => set('email', e.target.value)} disabled={isPending}
          className="w-full h-11 rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors disabled:bg-surface-container-high disabled:text-secondary disabled:cursor-not-allowed" required autoComplete="email" />
      </div>
      {includePassword && (
        <>
          <div>
            <label className="block text-sm font-semibold text-on-surface-variant mb-1.5" htmlFor="password">{t('auth.password')}</label>
            <div className="relative">
              <input id="password" type={showPw ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)}
                className="w-full h-11 rounded-lg border border-outline-variant bg-surface px-3 pe-10 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors" placeholder={t('auth.passwordPlaceholder')} required minLength={6} autoComplete="current-password" />
              <button type="button" className="absolute end-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition-colors" onClick={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-on-surface-variant mb-1.5" htmlFor="confirmPassword">{t('auth.confirmPassword')}</label>
            <div className="relative">
              <input id="confirmPassword" type={showConfirmPw ? 'text' : 'password'} value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)}
                className="w-full h-11 rounded-lg border border-outline-variant bg-surface px-3 pe-10 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors" placeholder={t('auth.confirmPasswordPlaceholder')} required autoComplete="new-password" />
              <button type="button" className="absolute end-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition-colors" onClick={() => setShowConfirmPw(!showConfirmPw)}>
                {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </>
      )}
      <div>
        <label className="block text-sm font-semibold text-on-surface-variant mb-1.5" htmlFor="phone"><Phone className="w-3.5 h-3.5 inline me-1" />{t('auth.phoneNumber')}</label>
        <input id="phone" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
          className="w-full h-11 rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors" />
      </div>
      <div>
        <label className="block text-sm font-semibold text-on-surface-variant mb-1.5" htmlFor="role"><Shield className="w-3.5 h-3.5 inline me-1" />{t('auth.iAmA')} <span className="text-error">*</span></label>
        <select id="role" value={form.role} onChange={e => { set('role', e.target.value); setSerialState('idle'); }}
          className="w-full h-11 rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors">
          <option value="">{t('auth.selectRole')}</option>
          {ROLES.map(r => <option key={r} value={r}>{t('common.' + r)}</option>)}
        </select>
      </div>
      {form.role && (
        <div className="bg-surface-container-high/50 rounded-lg p-4 border border-outline-variant/50 space-y-4">
          {roleFields()}
        </div>
      )}
      <div>
        <label className="block text-sm font-semibold text-on-surface-variant mb-1.5">
          {t('auth.invitationCode')} <span className="text-secondary font-normal">{t('auth.invitationHint')}</span>
        </label>
        <input type="text" value={form.serial} onChange={e => set('serial', e.target.value)}
          className="w-full h-11 rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          placeholder={t('auth.codePlaceholder')} />
        {serialState === 'valid' && <p className="text-xs text-tertiary mt-1">{t('auth.codeVerified')}</p>}
        {serialState === 'invalid' && <p className="text-xs text-error mt-1">{t('auth.codeInvalid')}</p>}
        {serialState === 'mismatch' && <p className="text-xs text-warning mt-1">{t('auth.codeRoleMismatch', { role: serialRole, selected: form.role })}</p>}
      </div>
    </>
  );

  if (isPending) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-surface-container-low to-background p-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
                <School className="w-7 h-7 text-on-primary" />
              </div>
              <h1 className="text-2xl font-bold text-on-background">{t('auth.completeAccount')}</h1>
              <p className="text-secondary mt-1">{t('auth.completeSubtitle')}</p>
            </div>
            <div className="bg-surface-container-lowest/70 backdrop-blur-xl border border-outline-variant rounded-2xl p-6 space-y-4 shadow-sm">
              <form onSubmit={handleComplete} className="space-y-4">
                {commonFields(false)}
                <button type="submit" disabled={submitting}
                  className="w-full h-11 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><UserPlus className="w-4 h-4" /> {t('auth.completeBtn')}</>}
                </button>
                {error && <div className="bg-error/10 text-error text-sm px-4 py-2.5 rounded-lg" role="alert">{error}</div>}
              </form>
            </div>
          </div>
        </div>
        {showApprovalModal && <ApprovalModal onOk={() => navigate('/', { replace: true })} t={t} />}
      </>
    );
  }

  return (
    <>
      <SEO title="Sign In" noindex />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-surface-container-low to-background p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
              <School className="w-7 h-7 text-on-primary" />
            </div>
            <h1 className="text-2xl font-bold text-on-background">{t('auth.welcomeBack')}</h1>
            <p className="text-secondary mt-1">{t('auth.signInSubtitle', { school: DEFAULT_SCHOOL_NAME })}</p>
          </div>
          <div className="bg-surface-container-lowest/70 backdrop-blur-xl border border-outline-variant rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex gap-1 p-1 bg-surface-container-high rounded-lg">
              <button onClick={() => { setTab('signin'); setError(null); setCheckEmail(false); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${tab === 'signin' ? 'bg-surface text-primary shadow-sm' : 'text-secondary hover:text-on-surface'}`}>{t('auth.signIn')}</button>
              <button onClick={() => { setTab('signup'); setError(null); setCheckEmail(false); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${tab === 'signup' ? 'bg-surface text-primary shadow-sm' : 'text-secondary hover:text-on-surface'}`}>{t('auth.createAccount')}</button>
            </div>

            <div className="relative my-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-outline-variant" />
              </div>
              <div className="relative flex justify-center text-[11px]">
                <span className="bg-surface-container-lowest px-2.5 text-secondary uppercase tracking-wide font-medium">{t('auth.or')}</span>
              </div>
            </div>

            <button type="button" onClick={handleGoogleSignIn} disabled={googleLoading}
              className="w-full h-11 border border-outline-variant rounded-lg text-sm font-semibold hover:bg-surface-container-low active:bg-surface-container-high transition-colors flex items-center justify-center gap-2.5 disabled:opacity-50">
              {googleLoading ? (
                <span className="w-4 h-4 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              {t('auth.signInGoogle')}
            </button>

            {tab === 'signin' && !showForgot && (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-on-surface-variant mb-1.5" htmlFor="signin-email">{t('auth.email')}</label>
                  <input id="signin-email" type="email" value={form.email} onChange={e => set('email', e.target.value)}
                    className="w-full h-11 rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors" placeholder={t('auth.emailPlaceholder')} required autoComplete="email" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-on-surface-variant mb-1.5" htmlFor="signin-password">{t('auth.password')}</label>
                  <div className="relative">
                    <input id="signin-password" type={showPw ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)}
                      className="w-full h-11 rounded-lg border border-outline-variant bg-surface px-3 pe-10 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors" placeholder="••••••••" required autoComplete="current-password" />
                    <button type="button" className="absolute end-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition-colors" onClick={() => setShowPw(!showPw)}>
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button type="button" onClick={() => { setShowForgot(true); setError(null); }}
                  className="text-xs text-primary hover:underline -mt-2 block">{t('auth.forgotPassword')}</button>
                {blocked && (
                  <div className="flex items-center gap-2 bg-error/10 text-error text-sm px-4 py-2.5 rounded-lg" role="alert">
                    <Timer className="w-4 h-4 shrink-0" /> {t('auth.tooManyAttempts')}
                  </div>
                )}
                <button type="submit" disabled={submitting || blocked}
                  className="w-full h-11 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><LogIn className="w-4 h-4" /> {t('auth.signIn')}</>}
                </button>
                {error && <div className="bg-error/10 text-error text-sm px-4 py-2.5 rounded-lg" role="alert">{error}</div>}
              </form>
            )}

            {tab === 'signin' && showForgot && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {resetSent ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-secondary">{t('auth.checkEmail')}</p>
                    <button type="button" onClick={() => { setShowForgot(false); setResetSent(false); setError(null); }}
                      className="mt-4 text-sm text-primary hover:underline">{t('auth.backToSignIn')}</button>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-on-surface-variant mb-1.5" htmlFor="reset-email">{t('auth.email')}</label>
                      <input id="reset-email" type="email" value={form.email} onChange={e => set('email', e.target.value)}
                        className="w-full h-11 rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors" placeholder={t('auth.emailPlaceholder')} required autoComplete="email" />
                    </div>
                    <button type="submit" disabled={submitting}
                      className="w-full h-11 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2">
                      {submitting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>{t('auth.sendResetLink')}</>}
                    </button>
                    <button type="button" onClick={() => { setShowForgot(false); setError(null); }}
                      className="w-full text-xs text-secondary hover:text-primary transition-colors">{t('auth.backToSignIn')}</button>
                    {error && <div className="bg-error/10 text-error text-sm px-4 py-2.5 rounded-lg" role="alert">{error}</div>}
                  </>
                )}
              </form>
            )}

            {tab === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-4">
                {checkEmail ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-secondary">{t('auth.checkEmailSignup')}</p>
                    <button type="button" onClick={() => { setCheckEmail(false); setError(null); }}
                      className="mt-4 text-sm text-primary hover:underline">{t('auth.backToSignIn')}</button>
                  </div>
                ) : (
                  <>
                    {commonFields(true)}
                    <button type="submit" disabled={submitting}
                      className="w-full h-11 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2">
                      {submitting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><UserPlus className="w-4 h-4" /> {t('auth.createBtn')}</>}
                    </button>
                    {error && <div className="bg-error/10 text-error text-sm px-4 py-2.5 rounded-lg" role="alert">{error}</div>}
                  </>
                )}
              </form>
            )}

            <p className="text-center text-xs text-secondary pt-2">
              <a href="/" className="text-primary hover:underline">{t('auth.backToHome')}</a>
            </p>
          </div>
        </div>
      </div>
      {showApprovalModal && <ApprovalModal onOk={() => navigate('/', { replace: true })} t={t} />}
    </>
  );
}

function ApprovalModal({ onOk, t }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-xl p-8 max-w-sm w-full text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <School className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-on-background">{t('auth.pendingApproval')}</h2>
        <p className="text-sm text-secondary">
          {t('auth.pendingMessage')}
        </p>
        <button onClick={onOk}
          className="w-full h-11 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors shadow-sm">
          {t('auth.ok')}
        </button>
      </div>
    </div>
  );
}
