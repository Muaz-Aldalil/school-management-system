import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { School, Building2, User, CheckCircle, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { PHONE_REGEX } from '../lib/utils';

const STEPS = ['step1', 'step2', 'step3'];

export default function Onboarding() {
  const { t } = useLanguage();
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    schoolName: '',
    schoolNameEn: '',
    schoolAddress: '',
    schoolPhone: '',
    schoolEmail: '',
    adminName: user?.name || '',
    adminPhone: '',
  });

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const validateStep = (s) => {
    if (s === 0) {
      if (!form.schoolName.trim()) { setError(t('onboarding.schoolNameRequired')); return false; }
    }
    if (s === 1) {
      if (!form.adminName.trim()) { setError(t('onboarding.adminNameRequired')); return false; }
      if (form.schoolPhone && !PHONE_REGEX.test(form.schoolPhone.replace(/\s/g, ''))) { setError(t('settings.invalidPhone')); return false; }
    }
    setError('');
    return true;
  };

  const next = () => { if (validateStep(step)) setStep(s => Math.min(s + 1, STEPS.length - 1)); };
  const prev = () => { setError(''); setStep(s => Math.max(s - 1, 0)); };

  const handleComplete = async () => {
    if (!validateStep(step)) return;
    setSaving(true);
    setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('bootstrap_school', {
        p_name: form.schoolName.trim(),
        p_name_en: form.schoolNameEn.trim() || '',
        p_address: form.schoolAddress.trim(),
        p_phone: form.schoolPhone.trim(),
        p_email: form.schoolEmail.trim(),
        p_admin_name: form.adminName.trim(),
        p_admin_phone: form.adminPhone.trim(),
      });
      if (rpcError) throw rpcError;
      await refreshProfile();
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.message || 'Setup failed. Please try again.');
      setSaving(false);
    }
  };

  const stepIcons = [Building2, User, CheckCircle];
  const StepIcon = stepIcons[step];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-primary-container flex items-center justify-center mx-auto">
            <School className="w-8 h-8 text-on-primary-container" />
          </div>
          <h1 className="text-2xl font-bold text-on-background">{t('onboarding.welcome')}</h1>
          <p className="text-sm text-secondary">{t('onboarding.welcomeDesc')}</p>
        </div>

        <div className="flex items-center justify-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i <= step ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-secondary'
              }`}>{i + 1}</div>
              {i < STEPS.length - 1 && <div className={`w-8 h-0.5 ${i < step ? 'bg-primary' : 'bg-surface-container-high'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center">
              <StepIcon className="w-5 h-5 text-on-primary-container" />
            </div>
            <div>
              <h2 className="font-bold text-on-surface">{t('onboarding.' + STEPS[step])}</h2>
              <p className="text-xs text-secondary">{t('onboarding.' + STEPS[step] + 'Desc')}</p>
            </div>
          </div>

          {error && (
            <div className="bg-error-container/30 text-on-error-container text-xs p-3 rounded-lg">{error}</div>
          )}

          {step === 0 && (
            <div className="space-y-4">
              <Field label={t('onboarding.schoolName')} value={form.schoolName} onChange={v => update('schoolName', v)} required />
              <Field label={t('onboarding.schoolNameEn')} value={form.schoolNameEn} onChange={v => update('schoolNameEn', v)} placeholder="Al-Amiriya School" />
              <Field label={t('onboarding.schoolAddress')} value={form.schoolAddress} onChange={v => update('schoolAddress', v)} />
              <Field label={t('onboarding.schoolPhone')} value={form.schoolPhone} onChange={v => update('schoolPhone', v)} placeholder="+249XXXXXXXXX" />
              <Field label={t('onboarding.schoolEmail')} value={form.schoolEmail} onChange={v => update('schoolEmail', v)} type="email" />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <Field label={t('onboarding.adminName')} value={form.adminName} onChange={v => update('adminName', v)} required />
              <Field label={t('onboarding.adminPhone')} value={form.adminPhone} onChange={v => update('adminPhone', v)} placeholder="+249XXXXXXXXX" />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3 text-sm">
              <ReviewRow label={t('onboarding.schoolName')} value={form.schoolName} />
              {form.schoolNameEn && <ReviewRow label={t('onboarding.schoolNameEn')} value={form.schoolNameEn} />}
              {form.schoolAddress && <ReviewRow label={t('onboarding.schoolAddress')} value={form.schoolAddress} />}
              {form.schoolPhone && <ReviewRow label={t('onboarding.schoolPhone')} value={form.schoolPhone} />}
              {form.schoolEmail && <ReviewRow label={t('onboarding.schoolEmail')} value={form.schoolEmail} />}
              <div className="border-t border-outline-variant pt-3 mt-3" />
              <ReviewRow label={t('onboarding.adminName')} value={form.adminName} />
              {form.adminPhone && <ReviewRow label={t('onboarding.adminPhone')} value={form.adminPhone} />}
            </div>
          )}

          <div className="flex justify-between pt-2">
            {step > 0 ? (
              <button onClick={prev} disabled={saving} className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-secondary hover:bg-surface-container-low rounded-lg transition-colors">
                <ArrowLeft className="w-4 h-4" />
                {t('onboarding.back')}
              </button>
            ) : <div />}

            {step < STEPS.length - 1 ? (
              <button onClick={next} className="flex items-center gap-1.5 bg-primary text-on-primary px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors">
                {t('onboarding.next')}
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleComplete} disabled={saving} className="flex items-center gap-2 bg-primary text-on-primary px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {saving ? t('onboarding.settingUp') : t('onboarding.complete')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder = '', required = false }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-secondary mb-1">{label}{required && ' *'}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary"
      />
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-secondary">{label}</span>
      <span className="font-semibold text-on-surface">{value}</span>
    </div>
  );
}
