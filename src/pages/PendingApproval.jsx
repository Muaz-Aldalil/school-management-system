import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Clock, School } from 'lucide-react';
import SEO from '../components/SEO';

export default function PendingApproval() {
  const { t } = useLanguage();
  return (
    <><SEO title="Account Pending" noindex />
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-surface-container-low to-background p-4">
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Clock className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-on-background mb-2">{t('pendingApproval.title')}</h1>
        <p className="text-secondary mb-6">{t('pendingApproval.message')}</p>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 mb-6 text-start text-sm space-y-2">
          <p className="text-secondary">{t('pendingApproval.onceApproved')}</p>
          <ul className="text-on-surface-variant space-y-1 ms-4 list-disc">
            <li>{t('pendingApproval.accessDashboard')}</li>
            <li>{t('pendingApproval.viewGrades')}</li>
            <li>{t('pendingApproval.fullFunctionality')}</li>
          </ul>
        </div>
        <Link to="/login" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-semibold hover:bg-primary-container transition-colors shadow-md">
          <School className="w-4 h-4" /> {t('pendingApproval.backToLogin')}
        </Link>
      </div>
    </div>
    </>
  );
}
