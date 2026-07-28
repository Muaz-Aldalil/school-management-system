import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { Lock, Eye, EyeOff } from 'lucide-react';

export default function PasswordChangeForm() {
  const { changePassword, error, setError, user } = useAuth();
  const toast = useToast();
  const { t } = useLanguage();
  const [current, setCurrent] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState({ c: false, n: false, cf: false });
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPw !== confirm) { setError(t('passwordChange.noMatch')); return; }
    if (newPw.length < 6) { setError(t('passwordChange.minChars')); return; }
    setBusy(true);
    const ok = await changePassword(current, newPw);
    setBusy(false);
    if (ok) { toast(t('passwordChange.changed')); setCurrent(''); setNewPw(''); setConfirm(''); }
  };

  if (!user) return null;

  const labels = [t('passwordChange.currentPassword'), t('passwordChange.newPassword'), t('passwordChange.confirmNewPassword')];

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 md:p-6">
      <h3 className="text-sm font-bold text-on-background mb-3 flex items-center gap-2"><Lock className="w-4 h-4 text-primary" /> {t('passwordChange.title')}</h3>
      <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
        {error && <div className="bg-error/10 text-error text-sm px-3 py-2 rounded-lg">{error}</div>}
        {labels.map((label, i) => {
          const key = ['c', 'n', 'cf'][i];
          const val = [current, newPw, confirm][i];
          const set = [setCurrent, setNewPw, setConfirm][i];
          return (
            <div key={key}>
              <label className="block text-xs font-semibold text-secondary mb-1">{label}</label>
              <div className="relative">
                <input type={show[key] ? 'text' : 'password'} value={val} onChange={e => set(e.target.value)}
                  className="w-full h-10 rounded-lg border border-outline-variant bg-surface px-3 pe-10 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors" required />
                <button type="button" aria-label={show[key] ? t('resetPassword.hide') : t('resetPassword.show')} className="absolute end-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary" onClick={() => setShow(s => ({ ...s, [key]: !s[key] }))}>
                  {show[key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          );
        })}
        <button type="submit" disabled={busy} className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors disabled:opacity-50">
          {busy ? t('passwordChange.saving') : t('passwordChange.change')}
        </button>
      </form>
    </div>
  );
}
