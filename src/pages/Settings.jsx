import { useState, useEffect, useRef, useCallback } from 'react';
import { Building2, User, Bell, Shield, Save, Upload, Trash2, Download, Globe, Sun, Moon, Loader2, AlertTriangle, WifiOff } from 'lucide-react';
import { useSchool } from '../context/SchoolContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import useTheme from '../hooks/useTheme';
import RoleGate from '../components/RoleGate';
import Reveal from '../components/Reveal';
import PasswordChangeForm from '../components/PasswordChangeForm';
import { supabase } from '../lib/supabase';
import { uploadSchoolLogo, deleteSchoolLogo } from '../lib/storage';
import { APP_VERSION, ACADEMIC_TERMS, DEFAULT_SCHOOL_NAME } from '../lib/constants';

function buildForm(schoolInfo, settings) {
  return {
    schoolName: schoolInfo.schoolName || DEFAULT_SCHOOL_NAME,
    schoolAddress: schoolInfo.schoolAddress || '',
    schoolPhone: schoolInfo.schoolPhone || '',
    schoolEmail: schoolInfo.schoolEmail || '',
    schoolLogoUrl: schoolInfo.schoolLogoUrl || '',
    academicYear: schoolInfo.academicYear || '',
    academicTerm: schoolInfo.academicTerm || '',
    adminName: schoolInfo.adminName || '',
    adminEmail: schoolInfo.adminEmail || '',
    smsOn: schoolInfo.smsOn !== false,
    emailOn: schoolInfo.emailOn === true,
    supervisors: settings.supervisors || [],
    accountants: settings.accountants || [],
  };
}

export default function Settings() {
  const toast = useToast();
  const { t, lang } = useLanguage();
  const { theme, toggle: toggleTheme } = useTheme();
  const { setLang } = useLanguage();
  const { saveSchoolInfo, schoolInfo, settings, students, grades, payments } = useSchool();
  const [form, setForm] = useState(() => buildForm(schoolInfo, settings));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [systemStatus, setSystemStatus] = useState('checking');
  const [online, setOnline] = useState(navigator.onLine);
  const [logoError, setLogoError] = useState(false);
  const logoInputRef = useRef(null);

  useEffect(() => { setForm(buildForm(schoolInfo, settings)); }, [schoolInfo, settings]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  useEffect(() => {
    let cancelled = false;
    setSystemStatus('checking');
    supabase.rpc('ping').then(({ error }) => {
      if (!cancelled) setSystemStatus(error ? 'fail' : 'ok');
    }).catch(() => { if (!cancelled) setSystemStatus('fail'); });
    return () => { cancelled = true; };
  }, []);

  const set = (key, value) => { setForm(f => ({ ...f, [key]: value })); setDirty(true); };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast(t('settings.logoTooLarge')); return; }
    setLogoBusy(true);
    try {
      const url = await uploadSchoolLogo(file, schoolInfo.schoolId || form.schoolName);
      set('schoolLogoUrl', url);
    } catch (err) {
      toast(t('settings.logoUploadFailed'));
    } finally {
      setLogoBusy(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleLogoRemove = async () => {
    setLogoBusy(true);
    try {
      await deleteSchoolLogo(schoolInfo.schoolId || form.schoolName);
      set('schoolLogoUrl', '');
    } catch {
      toast(t('settings.logoRemoveFailed'));
    } finally {
      setLogoBusy(false);
    }
  };

  const save = async () => {
    if (!form.schoolName?.trim()) { toast(t('settings.nameRequired')); return; }
    if (form.adminEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.adminEmail)) { toast(t('settings.invalidEmail')); return; }
    if (form.schoolPhone && !/^[\d\s\-+()]{7,20}$/.test(form.schoolPhone)) { toast(t('settings.invalidPhone')); return; }
    const validEmail = (e) => !e || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
    const supervisors = (form.supervisors || []).filter(validEmail);
    const accountants = (form.accountants || []).filter(validEmail);
    if (supervisors.length !== (form.supervisors || []).length || accountants.length !== (form.accountants || []).length) {
      toast(t('settings.invalidEmailsRemoved'));
    }
    const info = { ...form, supervisors, accountants };
    setSaving(true);
    try {
      await saveSchoolInfo(info);
      setDirty(false);
      toast(t('settings.saved'));
    } catch (err) {
      toast(t('settings.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const exportData = useCallback((format) => {
    const payload = { students, grades, payments, exportedAt: new Date().toISOString() };
    let blob, filename;
    if (format === 'csv') {
      const headers = ['Name', 'Class', 'Grade', 'Status', 'Parent', 'Phone'];
      const rows = (students || []).map(s => [s.name, s.class, s.grade, s.status, s.parent, s.phone].map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(','));
      blob = new Blob([headers.join(',') + '\n' + rows.join('\n')], { type: 'text/csv' });
      filename = `eduadmin-export-${new Date().toISOString().slice(0, 10)}.csv`;
    } else {
      blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      filename = `eduadmin-export-${new Date().toISOString().slice(0, 10)}.json`;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }, [students, grades, payments]);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <Reveal>
        <header>
          <h2 className="text-headline-md text-on-background">{t('settings.title')}</h2>
          <p className="text-body-md text-secondary mt-1">{t('settings.subtitle')}</p>
        </header>
      </Reveal>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* School Info */}
          <Reveal delay={0.1}><section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6">
            <div className="flex items-center gap-2 border-b border-outline-variant pb-4 mb-4">
              <Building2 className="w-5 h-5 text-primary" />
              <h3 className="text-headline-md text-on-background">{t('settings.schoolInfo')}</h3>
            </div>
            <div className="space-y-4">
              {/* Logo */}
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => logoInputRef.current?.click()} className="relative w-20 h-20 rounded-xl border-2 border-dashed border-outline-variant hover:border-primary transition-colors flex items-center justify-center overflow-hidden bg-surface group">
                  {form.schoolLogoUrl && !logoError ? (
                    <img src={form.schoolLogoUrl} alt="Logo" className="w-full h-full object-cover" onError={() => setLogoError(true)} />
                  ) : form.schoolLogoUrl && logoError ? (
                    <div className="text-center">
                      <WifiOff className="w-5 h-5 text-error mx-auto mb-1" />
                      <span className="text-[10px] text-error">{t('sync.offlineLogo')}</span>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="w-5 h-5 text-secondary mx-auto mb-1 group-hover:text-primary transition-colors" />
                      <span className="text-[10px] text-secondary group-hover:text-primary transition-colors">{t('settings.uploadLogo')}</span>
                    </div>
                  )}
                  {logoBusy && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Loader2 className="w-5 h-5 text-white animate-spin" /></div>}
                </button>
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                {form.schoolLogoUrl && (
                  <button type="button" onClick={handleLogoRemove} disabled={logoBusy} className="text-xs text-error hover:text-error/80 transition-colors flex items-center gap-1">
                    <Trash2 className="w-3.5 h-3.5" /> {t('settings.removeLogo')}
                  </button>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1" htmlFor="schoolName">{t('settings.schoolName')}</label>
                <input className="w-full h-10 rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors" id="schoolName" type="text" value={form.schoolName} onChange={e => set('schoolName', e.target.value)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1" htmlFor="schoolEmail">{t('settings.schoolEmail')}</label>
                  <input className="w-full h-10 rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors" id="schoolEmail" type="email" value={form.schoolEmail} onChange={e => set('schoolEmail', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1" htmlFor="schoolPhone">{t('settings.phoneNumber')}</label>
                  <input className="w-full h-10 rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors" id="schoolPhone" type="tel" value={form.schoolPhone} onChange={e => set('schoolPhone', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1" htmlFor="schoolAddress">{t('settings.address')}</label>
                <textarea className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors" id="schoolAddress" rows="2" value={form.schoolAddress} onChange={e => set('schoolAddress', e.target.value)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1" htmlFor="academicYear">{t('settings.academicYear')}</label>
                  <input className="w-full h-10 rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors" id="academicYear" type="text" placeholder="2025-2026" value={form.academicYear} onChange={e => set('academicYear', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1" htmlFor="academicTerm">{t('settings.academicTerm')}</label>
                  <select className="w-full h-10 rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors" id="academicTerm" value={form.academicTerm} onChange={e => set('academicTerm', e.target.value)}>
                    <option value="">—</option>
                    {ACADEMIC_TERMS.map(term => (
                      <option key={term.value} value={term.value}>{lang === 'ar' ? term.value : term.en}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section></Reveal>

          {/* Admin Profile */}
          <Reveal delay={0.2}><section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6">
            <div className="flex items-center gap-2 border-b border-outline-variant pb-4 mb-4">
              <User className="w-5 h-5 text-primary" />
              <h3 className="text-headline-md text-on-background">{t('settings.adminProfile')}</h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1" htmlFor="adminName">{t('settings.fullName')}</label>
                  <input className="w-full h-10 rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors" id="adminName" type="text" value={form.adminName} onChange={e => set('adminName', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1" htmlFor="adminEmail">{t('settings.emailAddress')}</label>
                  <input className="w-full h-10 rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors" id="adminEmail" type="email" value={form.adminEmail} onChange={e => set('adminEmail', e.target.value)} />
                </div>
              </div>
            </div>
          </section></Reveal>

          {/* Roles */}
          <Reveal delay={0.25}><RoleGate roles={['admin']}><section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6">
            <div className="flex items-center gap-2 border-b border-outline-variant pb-4 mb-4">
              <Shield className="w-5 h-5 text-primary" />
              <h3 className="text-headline-md text-on-background">{t('settings.roles')}</h3>
            </div>
            <div className="space-y-4">
              <EmailListInput label={t('settings.supervisors')} emails={form.supervisors} onChange={v => set('supervisors', v)} placeholder={t('settings.emailPlaceholder')} addLabel={t('settings.add')} invalidMsg={t('settings.invalidEmailFormat')} />
              <EmailListInput label={t('settings.accountants')} emails={form.accountants} onChange={v => set('accountants', v)} placeholder={t('settings.emailPlaceholder')} addLabel={t('settings.add')} invalidMsg={t('settings.invalidEmailFormat')} />
            </div>
          </section></RoleGate></Reveal>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          {/* Notifications */}
          <Reveal delay={0.3}><section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6">
            <div className="flex items-center gap-2 border-b border-outline-variant pb-4 mb-4">
              <Bell className="w-5 h-5 text-primary" />
              <h3 className="text-headline-md text-on-background">{t('settings.notifications')}</h3>
            </div>
            <div className="space-y-4">
              <ToggleRow label={t('settings.smsReminders')} desc={t('settings.smsDesc')} badge={t('settings.comingSoon')} checked={form.smsOn} onChange={v => set('smsOn', v)} />
              <div className="w-full h-px bg-outline-variant/30" />
              <ToggleRow label={t('settings.emailAlerts')} desc={t('settings.emailDesc')} badge={t('settings.comingSoon')} checked={form.emailOn} onChange={v => set('emailOn', v)} />
            </div>
          </section></Reveal>

          {/* Language & Theme */}
          <Reveal delay={0.35}><section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6">
            <div className="flex items-center gap-2 border-b border-outline-variant pb-4 mb-4">
              <Globe className="w-5 h-5 text-primary" />
              <h3 className="text-headline-md text-on-background">{t('settings.language')} & {t('settings.theme')}</h3>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-on-surface-variant mb-2">{t('settings.language')}</p>
                <div className="flex gap-2">
                  <PillButton active={lang === 'en'} onClick={() => setLang('en')}>English</PillButton>
                  <PillButton active={lang === 'ar'} onClick={() => setLang('ar')}>{t('settings.languageArabic')}</PillButton>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-on-surface-variant mb-2">{t('settings.theme')}</p>
                <div className="flex gap-2">
                  <PillButton active={theme === 'light'} onClick={() => { if (theme !== 'light') toggleTheme(); }} icon={<Sun className="w-3.5 h-3.5" />}>Light</PillButton>
                  <PillButton active={theme === 'dark'} onClick={() => { if (theme !== 'dark') toggleTheme(); }} icon={<Moon className="w-3.5 h-3.5" />}>Dark</PillButton>
                </div>
              </div>
            </div>
          </section></Reveal>

          {/* System Status */}
          <Reveal delay={0.4}><section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 bg-gradient-to-br from-surface-container-lowest to-surface-container-low">
            <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-4">{t('settings.systemStatus')}</p>
            <div className="flex items-center gap-2 mb-1">
              {systemStatus === 'checking' ? (
                <><Loader2 className="w-3 h-3 text-secondary animate-spin" /><p className="text-sm font-semibold text-on-background">{t('settings.systemCheck')}</p></>
              ) : systemStatus === 'ok' ? (
                <><div className="w-3 h-3 rounded-full bg-tertiary-fixed-dim" /><p className="text-sm font-semibold text-on-background">{t('settings.systemOk')}</p></>
              ) : (
                <><div className="w-3 h-3 rounded-full bg-error" /><p className="text-sm font-semibold text-error">{t('settings.systemFail')}</p></>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-outline-variant">
              <p className="text-caption-xs text-secondary">{form.schoolName || 'EduAdmin'} v{APP_VERSION}</p>
            </div>
          </section></Reveal>

          {/* Danger Zone */}
          <Reveal delay={0.45}><section className="rounded-xl border-2 border-error/30 p-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-error" />
              <p className="text-sm font-bold text-error">{t('settings.dangerZone')}</p>
            </div>
            <p className="text-xs text-secondary mb-3">{t('settings.exportDesc')}</p>
            <div className="flex gap-2">
              <button onClick={() => exportData('json')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-outline-variant hover:bg-surface-container-low transition-colors">
                <Download className="w-3.5 h-3.5" /> {t('settings.exportJSON')}
              </button>
              <button onClick={() => exportData('csv')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-outline-variant hover:bg-surface-container-low transition-colors">
                <Download className="w-3.5 h-3.5" /> {t('settings.exportCSV')}
              </button>
            </div>
          </section></Reveal>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-4 pt-4 border-t border-outline-variant">
        <button onClick={() => { setForm(buildForm(schoolInfo, settings)); setDirty(false); }} className="px-6 py-2 rounded-lg text-sm font-semibold text-secondary hover:bg-surface-container-low transition-colors">
          {t('settings.cancel')}
        </button>
        <button onClick={save} disabled={!dirty || saving} className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors ${dirty && !saving ? 'bg-primary text-on-primary hover:bg-primary-container cursor-pointer' : 'bg-surface-container-high text-secondary cursor-not-allowed'}`}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? '...' : t('settings.saveChanges')}
        </button>
      </div>

      <Reveal delay={0.5}>
        <PasswordChangeForm />
      </Reveal>
    </div>
  );
}

function EmailListInput({ label, emails, onChange, placeholder, addLabel, invalidMsg }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const add = () => {
    const val = input.trim();
    if (!val) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) { setError(invalidMsg); return; }
    if (emails.includes(val)) { setError(''); setInput(''); return; }
    onChange([...emails, val]);
    setInput('');
    setError('');
  };

  const remove = (email) => onChange(emails.filter(e => e !== email));

  return (
    <div>
      <label className="block text-xs font-semibold text-secondary mb-2">{label}</label>
      {emails.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {emails.map(email => (
            <span key={email} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
              {email}
              <button type="button" onClick={() => remove(email)} className="hover:text-error transition-colors ml-0.5">&times;</button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input className="flex-1 h-9 rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors" type="email" placeholder={placeholder} value={input} onChange={e => { setInput(e.target.value); setError(''); }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
        <button type="button" onClick={add} className="px-3 h-9 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors">{addLabel}</button>
      </div>
      {error && <p className="text-xs text-error mt-1">{error}</p>}
    </div>
  );
}

function PillButton({ active, onClick, children, icon }) {
  return (
    <button type="button" onClick={onClick} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${active ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-secondary hover:bg-surface-container-highest'}`}>
      {icon}{children}
    </button>
  );
}

function ToggleRow({ label, desc, badge, checked, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-on-background">{label} {badge && <span className="ms-1.5 text-[10px] font-medium text-secondary bg-surface-container-highest px-1.5 py-0.5 rounded-full">{badge}</span>}</p>
        <p className="text-caption-xs text-secondary mt-1">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${checked ? 'bg-primary' : 'bg-surface-container-highest'}`}
      >
        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}
