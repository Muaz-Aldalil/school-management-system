import { useState, useMemo, useCallback } from 'react';
import { MessageCircle, Users, GraduationCap, AlertCircle, CheckCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useSchool } from '../../context/SchoolContext';
import { supabase } from '../../lib/supabase';
import { DEFAULT_SCHOOL_NAME } from '../../lib/constants';
import Reveal from '../../components/Reveal';

export default function NotificationCenter() {
  const { t } = useLanguage();
  const { students, payments, schoolId } = useSchool();
  const [sendTo, setSendTo] = useState('parents');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);

  const activeStudents = useMemo(() => students.filter(s => s.status === 'Active'), [students]);
  const overduePayments = useMemo(() => payments.filter(p => p.status === 'Overdue'), [payments]);

  const templates = [
    { key: 'paymentReminder', icon: AlertCircle, action: () => {
      const first = overduePayments[0];
      if (first) setMessage(`${t('notificationCenter.greeting')}\n${t('notificationCenter.paymentReminderBody')}\n${t('notificationCenter.studentLabel')} ${first.student}\n${t('notificationCenter.amountLabel')} ${first.amount} ${t('common.currencySDG')}\n${t('notificationCenter.dueDateLabel')} ${first.due_date}\n${DEFAULT_SCHOOL_NAME}`);
      else setMessage(t('common.noData'));
    }},
    { key: 'gradeReport', icon: GraduationCap, action: () => {
      setMessage(`${t('notificationCenter.greeting')}\n${t('notificationCenter.gradeReportBody')}\n\n${DEFAULT_SCHOOL_NAME}`);
    }},
    { key: 'generalNotice', icon: MessageCircle, action: () => {
      setMessage(`${t('notificationCenter.greeting')}\n${t('notificationCenter.generalNoticeBody')}\n${DEFAULT_SCHOOL_NAME}`);
    }},
  ];

  const recipients = useMemo(() => {
    return activeStudents.filter(s => s.phone).map(s => ({ phone: s.phone, name: s.name }));
  }, [activeStudents]);

  const recipientCount = sendTo === 'students' ? activeStudents.length : recipients.length;

  const handleSave = useCallback(async () => {
    if (!message.trim()) return;
    setSaving(true);
    try {
      await supabase.from('notifications').insert({
        message: message.trim(),
        school_id: schoolId || null,
        target_roles: ['admin'],
      });
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch (err) {
      console.error('sendNotification failed:', err);
    }
    setSaving(false);
  }, [message, schoolId]);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <Reveal>
        <div>
          <h2 className="text-headline-md text-on-background font-bold">{t('notificationCenter.title')}</h2>
          <p className="text-body-md text-secondary mt-1">{t('notificationCenter.subtitle')}</p>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 space-y-5">
          <div>
            <label className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2 block">{t('notificationCenter.sendTo')}</label>
            <div className="flex gap-2">
              {[
                { key: 'parents', icon: Users, label: t('notificationCenter.parents') },
                { key: 'students', icon: GraduationCap, label: t('notificationCenter.students') },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setSendTo(opt.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    sendTo === opt.key
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-low text-secondary hover:bg-surface-container'
                  }`}
                >
                  <opt.icon className="w-4 h-4" />
                  {opt.label}
                  <span className="text-xs opacity-70">({opt.key === 'parents' ? recipients.length : activeStudents.length})</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2 block">{t('notificationCenter.quickTemplates')}</label>
            <div className="flex gap-2 flex-wrap">
              {templates.map(tpl => (
                <button
                  key={tpl.key}
                  onClick={tpl.action}
                  className="flex items-center gap-1.5 px-3 py-2 bg-surface-container-low hover:bg-surface-container rounded-lg text-xs font-semibold text-secondary transition-colors"
                >
                  <tpl.icon className="w-3.5 h-3.5" />
                  {t('notificationCenter.' + tpl.key)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2 block">{t('notificationCenter.message')}</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={6}
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-3 text-sm text-on-surface resize-none focus:outline-none focus:border-primary"
            />
          </div>

          {sent && (
            <div className="flex items-center gap-2 text-sm text-tertiary bg-tertiary-container/30 rounded-lg p-3">
              <CheckCircle className="w-4 h-4" />
              {t('notificationCenter.sent')}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving || !message.trim()}
              className="flex items-center gap-2 bg-primary text-on-primary px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors disabled:opacity-50"
            >
              {saving ? t('common.saving') : t('notificationCenter.send')} ({recipientCount})
            </button>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
