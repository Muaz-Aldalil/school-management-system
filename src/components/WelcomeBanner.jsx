import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';

export default function WelcomeBanner() {
  const { user, profile, refreshProfile } = useAuth();
  const { t } = useLanguage();
  const [dismissing, setDismissing] = useState(false);

  if (!profile?.metadata?.needs_welcome || !user) return null;

  const dismiss = async () => {
    setDismissing(true);
    try {
      const meta = { ...profile.metadata, needs_welcome: false };
      const { error } = await supabase.from('profiles').update({ metadata: meta }).eq('id', user.id);
      if (error) return;
      await refreshProfile();
    } catch { /* best effort */ }
  };

  const dest = user.role === 'parent' ? '/parent' : user.role === 'student' ? '/student' : '/admin';

  return (
    <div className="mx-4 md:mx-6 mt-4 bg-tertiary/10 border border-tertiary/20 rounded-xl p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-tertiary shrink-0" />
        <p className="text-sm text-on-background">
          {t('welcomeBanner.approved')}{' '}
          <Link to={dest} className="text-tertiary font-semibold hover:underline">{t('welcomeBanner.goToDashboard')}</Link>
        </p>
      </div>
      <button onClick={dismiss} disabled={dismissing}
        className="text-secondary hover:text-on-background transition-colors shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
