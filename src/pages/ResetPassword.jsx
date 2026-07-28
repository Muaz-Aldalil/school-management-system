import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import { Key, School } from 'lucide-react';
import SEO from '../components/SEO';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      supabase.auth.getSession().then(({ data }) => {
        if (data?.session) setReady(true);
      });
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { setError(t('resetPassword.minChars')); return; }
    setSubmitting(true); setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (err) { setError('Failed to update password. Please try again.'); return; }
    setDone(true);
  };

  if (!window.location.hash.includes('type=recovery')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-surface-container-low to-background p-4">
        <div className="w-full max-w-md text-center">
          <Key className="w-12 h-12 text-secondary mx-auto mb-4" />
          <h1 className="text-xl font-bold text-on-background mb-2">{t('resetPassword.invalidLink')}</h1>
          <p className="text-sm text-secondary mb-6">{t('resetPassword.invalidLinkMsg')}</p>
          <Link to="/login" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-semibold hover:bg-primary-container transition-colors">
            <School className="w-4 h-4" /> {t('resetPassword.backToLogin')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <><SEO title="Reset Password" noindex />
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-surface-container-low to-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Key className="w-7 h-7 text-on-primary" />
          </div>
          <h1 className="text-2xl font-bold text-on-background">{t('resetPassword.resetPassword')}</h1>
          <p className="text-secondary mt-1">{t('resetPassword.enterNewPassword')}</p>
        </div>
        <div className="bg-surface-container-lowest/70 backdrop-blur-xl border border-outline-variant rounded-2xl p-6 space-y-4 shadow-sm">
          {done ? (
            <div className="text-center py-4 space-y-4">
              <p className="text-sm text-tertiary">{t('resetPassword.updated')}</p>
              <Link to="/login" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors">
                <School className="w-4 h-4" /> {t('resetPassword.signIn')}
              </Link>
            </div>
          ) : !ready ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-on-surface-variant mb-1.5">{t('resetPassword.newPassword')}</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full h-11 rounded-lg border border-outline-variant bg-surface px-3 pe-10 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors" placeholder={t('resetPassword.minChars')} required minLength={6} />
                  <button type="button" className="absolute end-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition-colors" onClick={() => setShowPw(!showPw)}>
                    {showPw ? t('resetPassword.hide') : t('resetPassword.show')}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={submitting}
                className="w-full h-11 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors shadow-sm disabled:opacity-50">
                {submitting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full inline-block animate-spin" /> : t('resetPassword.update')}
              </button>
              {error && <div className="bg-error/10 text-error text-sm px-4 py-2.5 rounded-lg">{error}</div>}
            </form>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
