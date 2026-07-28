import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useAutoLogout } from '../hooks/useAutoLogout';
import { ArrowLeft, School, GraduationCap, Sun, Moon } from 'lucide-react';
import useTheme from '../hooks/useTheme';
import WelcomeBanner from './WelcomeBanner';
import SEO from './SEO';

const ICONS = { school: School, graduation: GraduationCap };

export default function PortalLayout({ icon = 'school', label = 'Portal' }) {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();
  useAutoLogout();
  const Icon = ICONS[icon] || School;

  return (
    <div className="min-h-screen bg-background">
      <SEO title={label} noindex />
      <header className="sticky top-0 z-20 h-14 bg-surface-container-lowest/60 backdrop-blur-xl border-b border-outline-variant flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Link to="/" className="text-on-surface-variant hover:text-on-background transition-colors"><ArrowLeft className="w-4 h-4" /></Link>
          <Icon className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold text-on-background">{label}</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggle} className="p-2 rounded-xl text-secondary hover:text-primary hover:bg-surface-container-low/50 transition-all" title={theme === 'light' ? t('layout.darkMode') : t('layout.lightMode')}>
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
          <span className="text-xs text-secondary">{user?.name}</span>
          <button onClick={() => { signOut(); navigate('/login'); }} className="px-3 py-1.5 border border-outline-variant rounded-lg text-xs text-secondary hover:bg-surface-container-low transition-colors">{t('layout.logout')}</button>
        </div>
      </header>
      <main className="p-4 md:p-6 max-w-5xl mx-auto">
        <WelcomeBanner />
        <Outlet />
      </main>
    </div>
  );
}
