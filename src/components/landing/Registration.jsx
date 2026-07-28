import { useState, useEffect, useCallback, useMemo } from 'react';
import { GraduationCap, Users, Clock, CheckCircle, AlertCircle, User, Phone, Mail, FileText, Loader2 } from 'lucide-react';
import { useLanding } from '../../context/LandingContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { supabase, dbAvailable } from '../../lib/supabase';
import { localized } from '../../lib/localized';

function calcRemaining(dateStr) {
  const diff = new Date(dateStr + 'T23:59:59') - new Date();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

function CountdownStat({ deadline, t }) {
  const [remaining, setRemaining] = useState(() => calcRemaining(deadline));
  useEffect(() => {
    if (!deadline) return;
    const interval = setInterval(() => setRemaining(calcRemaining(deadline)), 1000);
    return () => clearInterval(interval);
  }, [deadline]);
  if (!remaining) return null;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-1.5 text-primary"><Clock className="w-5 h-5" /><span className="text-2xl font-bold">{remaining.days}</span></div>
      <p className="text-xs text-secondary">{t('registration.days')} {remaining.hours}:{String(remaining.minutes).padStart(2, '0')}</p>
    </div>
  );
}

export default function Registration() {
  const { registration, sections } = useLanding();
  const { t, lang } = useLanguage();
  const toast = useToast();
  const regSection = sections.find(s => s.type === 'registration');

  const [counts, setCounts] = useState({});
  const [selectedClass, setSelectedClass] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({ studentName: '', parentName: '', phone: '', email: '', currentClass: '', notes: '' });

  useEffect(() => {
    if (!regSection?.visible || !dbAvailable) return;
    let cancelled = false;
    supabase.from('registration_requests').select('desired_class').neq('status', 'cancelled').then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data) return;
      const c = {};
      data.forEach(r => { c[r.desired_class] = (c[r.desired_class] || 0) + 1; });
      setCounts(c);
    });
    return () => { cancelled = true; };
  }, [regSection?.visible]);

  const classes = useMemo(() => registration.classes || [], [registration.classes]);
  const deadline = registration.deadline || '';
  const deadlineDate = deadline ? new Date(deadline + 'T23:59:59') : null;
  const isExpired = deadlineDate && deadlineDate < new Date();
  const fullClassMsg = localized(registration.fullClassMessage, lang);

  const totalSpots = classes.reduce((s, c) => s + (c.maxSpots || 0), 0);
  const totalRegistered = Object.values(counts).reduce((s, n) => s + n, 0);
  const allFull = classes.length > 0 && classes.every(cls => (counts[cls.id] || 0) >= cls.maxSpots);

  const handleSubmit = useCallback(async () => {
    const e = {};
    if (!form.studentName.trim() || form.studentName.trim().length < 2) e.studentName = true;
    if (!form.parentName.trim() || form.parentName.trim().length < 2) e.parentName = true;
    const phoneClean = form.phone.replace(/[\s-]/g, '');
    if (!/^09\d{8,10}$/.test(phoneClean)) e.phone = true;
    if (!selectedClass) e.desiredClass = true;
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = true;
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    if (!dbAvailable) { toast(t('registration.errorSubmit'), 'error'); return; }

    setSubmitting(true);
    try {
      const yesterday = new Date(Date.now() - 86400000).toISOString();
      const { data: existing } = await supabase.from('registration_requests').select('id').eq('phone', phoneClean).eq('desired_class', selectedClass).gte('created_at', yesterday);
      if (existing && existing.length > 0) {
        toast(t('registration.duplicateError'), 'error');
        setSubmitting(false);
        return;
      }

      const cls = classes.find(c => c.id === selectedClass);
      const enrolledCount = counts[selectedClass] || 0;
      if (cls && enrolledCount >= cls.maxSpots) {
        toast(t('registration.fullClass'), 'error');
        setSubmitting(false);
        return;
      }

      const { error } = await supabase.from('registration_requests').insert({
        student_name: form.studentName.trim(),
        parent_name: form.parentName.trim(),
        phone: phoneClean,
        email: form.email.trim() || null,
        current_class: form.currentClass.trim() || null,
        desired_class: selectedClass,
        notes: form.notes.trim() || null,
      });
      if (error) throw error;
      setCounts(p => ({ ...p, [selectedClass]: (p[selectedClass] || 0) + 1 }));
      setSubmitted(true);
    } catch {
      toast(t('registration.errorSubmit'), 'error');
    } finally {
      setSubmitting(false);
    }
  }, [form, selectedClass, classes, counts, t, toast]);

  const setField = (key, val) => { setForm(p => ({ ...p, [key]: val })); setErrors(p => ({ ...p, [key]: '' })); };

  const resetForm = () => {
    setForm({ studentName: '', parentName: '', phone: '', email: '', currentClass: '', notes: '' });
    setSelectedClass('');
    setErrors({});
    setSubmitted(false);
  };

  if (!regSection?.visible) return null;

  if (submitted) {
    return (
      <section id="registration" className="py-20 bg-surface-container-low overflow-hidden">
        <div className="max-w-2xl mx-auto px-4 md:px-6 text-center">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-10 space-y-6">
            <div className="w-20 h-20 rounded-full bg-tertiary/10 flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-tertiary" />
            </div>
            <h3 className="text-2xl font-bold text-on-background">{t('registration.successTitle')}</h3>
            <p className="text-secondary">{localized(registration.successMessage, lang) || t('registration.successMessage')}</p>
            <button onClick={resetForm} className="px-6 py-3 bg-primary text-on-primary rounded-xl text-sm font-semibold hover:bg-primary-container transition-all">
              {t('registration.reset')}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="registration" className="py-20 bg-surface-container-low overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display text-on-background mb-3">{localized(registration.title, lang) || t('registration.title')}</h2>
          <p className="text-lg text-secondary max-w-2xl mx-auto">{localized(registration.subtitle, lang) || t('registration.subtitle')}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12 max-w-2xl mx-auto">
          {deadline && !isExpired && (
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-4 flex flex-col items-center">
              <CountdownStat deadline={deadline} t={t} />
              <p className="text-xs text-secondary mt-1">{t('registration.deadline')}</p>
            </div>
          )}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-4 flex flex-col items-center">
            <div className="flex items-center gap-1.5 text-primary"><GraduationCap className="w-5 h-5" /><span className="text-2xl font-bold">{classes.length}</span></div>
            <p className="text-xs text-secondary">{t('registration.classes')}</p>
          </div>
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-4 flex flex-col items-center">
            <div className="flex items-center gap-1.5 text-primary"><Users className="w-5 h-5" /><span className="text-2xl font-bold">{totalSpots - totalRegistered}</span></div>
            <p className="text-xs text-secondary">{t('registration.spots')}</p>
          </div>
        </div>

        {isExpired && (
          <div className="mb-8 max-w-2xl mx-auto bg-error/10 border border-error/30 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-error font-semibold text-sm">
              <AlertCircle className="w-4 h-4" /> {t('registration.deadline')}
            </div>
            {fullClassMsg && <p className="text-xs text-secondary mt-1">{fullClassMsg}</p>}
          </div>
        )}

        {allFull && !isExpired && (
          <div className="mb-8 max-w-2xl mx-auto bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-amber-600 font-semibold text-sm">
              <AlertCircle className="w-4 h-4" /> {t('registration.allClassesFull')}
            </div>
            {fullClassMsg && <p className="text-xs text-secondary mt-1">{fullClassMsg}</p>}
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {classes.map(cls => {
            const enrolled = counts[cls.id] || 0;
            const full = enrolled >= cls.maxSpots;
            const pct = cls.maxSpots > 0 ? Math.min((enrolled / cls.maxSpots) * 100, 100) : 0;
            const isSelected = selectedClass === cls.id;
            return (
              <button key={cls.id} disabled={full} onClick={() => { if (!full) { setSelectedClass(cls.id); setErrors(p => ({ ...p, desiredClass: '' })); } }}
                className={`text-start p-5 rounded-xl border-2 transition-all duration-200 ${full ? 'opacity-60 cursor-not-allowed border-outline-variant/30 bg-surface' : isSelected ? 'border-primary bg-primary/5 shadow-md' : 'border-outline-variant/30 bg-surface-container-lowest hover:border-primary/50 hover:shadow-sm'}`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-on-background">{localized(cls.name, lang)}</h4>
                  {full ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-error/10 text-error">{t('registration.fullClass')}</span>
                  ) : isSelected ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">✓</span>
                  ) : null}
                </div>
                <p className="text-xs text-secondary mb-3">{localized(cls.description, lang)}</p>
                <div className="w-full bg-surface rounded-full h-2 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${full ? 'bg-error' : pct > 80 ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[11px] text-secondary mt-1.5">
                  {full ? t('registration.fullClass') : t('registration.spotsAvailable', { count: cls.maxSpots - enrolled, total: cls.maxSpots })}
                </p>
                {full && fullClassMsg && (
                  <p className="text-[11px] text-error mt-1 font-medium">{fullClassMsg}</p>
                )}
              </button>
            );
          })}
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-6 sm:p-8">
            <h3 className="text-xl font-bold text-on-background mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> {t('registration.formTitle')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">{t('registration.studentName')} *</label>
                <div className="relative">
                  <User className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
                  <input type="text" value={form.studentName} onChange={e => setField('studentName', e.target.value)}
                    placeholder={t('registration.studentNamePlaceholder')}
                    className={`w-full h-11 rounded-xl border ${errors.studentName ? 'border-error' : 'border-outline-variant'} bg-surface ps-10 pe-4 text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors`} />
                </div>
                {errors.studentName && <p className="text-xs text-error mt-1">{t('common.name')} *</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">{t('registration.parentName')} *</label>
                <div className="relative">
                  <User className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
                  <input type="text" value={form.parentName} onChange={e => setField('parentName', e.target.value)}
                    placeholder={t('registration.parentNamePlaceholder')}
                    className={`w-full h-11 rounded-xl border ${errors.parentName ? 'border-error' : 'border-outline-variant'} bg-surface ps-10 pe-4 text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors`} />
                </div>
                {errors.parentName && <p className="text-xs text-error mt-1">{t('registration.parentName')} *</p>}
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">{t('registration.phone')} *</label>
                  <div className="relative">
                    <Phone className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
                    <input type="tel" value={form.phone} onChange={e => setField('phone', e.target.value)}
                      placeholder={t('registration.phonePlaceholder')}
                      className={`w-full h-11 rounded-xl border ${errors.phone ? 'border-error' : 'border-outline-variant'} bg-surface ps-10 pe-4 text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors`} />
                  </div>
                  {errors.phone && <p className="text-xs text-error mt-1">{t('registration.phone')} *</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">{t('registration.email')}</label>
                  <div className="relative">
                    <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
                    <input type="email" value={form.email} onChange={e => setField('email', e.target.value)}
                      placeholder={t('registration.emailPlaceholder')}
                      className={`w-full h-11 rounded-xl border ${errors.email ? 'border-error' : 'border-outline-variant'} bg-surface ps-10 pe-4 text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors`} />
                  </div>
                  {errors.email && <p className="text-xs text-error mt-1">{t('registration.email')}</p>}
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">{t('registration.currentClass')}</label>
                  <input type="text" value={form.currentClass} onChange={e => setField('currentClass', e.target.value)}
                    placeholder={t('registration.currentClassPlaceholder')}
                    className="w-full h-11 rounded-xl border border-outline-variant bg-surface px-4 text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">{t('registration.desiredClass')} *</label>
                  <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setErrors(p => ({ ...p, desiredClass: '' })); }}
                    className={`w-full h-11 rounded-xl border ${errors.desiredClass ? 'border-error' : 'border-outline-variant'} bg-surface px-4 text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors`}>
                    <option value="">{t('registration.selectClass')}</option>
                    {classes.map(cls => {
                      const enrolled = counts[cls.id] || 0;
                      const full = enrolled >= cls.maxSpots;
                      return <option key={cls.id} value={cls.id} disabled={full}>{localized(cls.name, lang)}{full ? ` (${t('registration.fullClass')})` : ''}</option>;
                    })}
                  </select>
                  {errors.desiredClass && <p className="text-xs text-error mt-1">{t('registration.desiredClass')} *</p>}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">{t('registration.notes')}</label>
                <textarea value={form.notes} onChange={e => setField('notes', e.target.value)} rows="3"
                  placeholder={t('registration.notesPlaceholder')}
                  className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors resize-none" />
              </div>
            </div>

            {registration.trustSignals && registration.trustSignals.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-6">
                {registration.trustSignals.map((sig, i) => (
                  <span key={i} className="text-xs font-medium text-tertiary bg-tertiary/10 px-3 py-1.5 rounded-full flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> {localized(sig, lang)}
                  </span>
                ))}
              </div>
            )}

            <button onClick={handleSubmit} disabled={submitting || isExpired}
              className="w-full mt-6 h-12 bg-primary text-on-primary rounded-xl text-sm font-bold hover:bg-primary-container disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-md">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('registration.submitting')}</> : isExpired ? <><AlertCircle className="w-4 h-4" /> {t('registration.deadline')}</> : t('registration.submit')}
            </button>

            {registration.privacyNote && (
              <p className="text-center text-xs text-secondary/70 mt-4">{localized(registration.privacyNote, lang)}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
