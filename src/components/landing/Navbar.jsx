import { useState } from 'react';
import { Link } from 'react-router-dom';
import { School, Menu, X, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

import { useLanding } from '../../context/LandingContext';
import useTheme from '../../hooks/useTheme';
import useActiveSection from '../../hooks/useActiveSection';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { t } = useLanguage();
  const { sections } = useLanding();
  const { theme, toggle } = useTheme();
  const active = useActiveSection(['hero', 'about', 'events', 'contact', 'registration']);
  const regSection = sections.find(s => s.type === 'registration');

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-container-lowest/60 backdrop-blur-xl border-b border-outline-variant">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <a href="#hero" className="flex items-center gap-2.5">
          <div className="hidden md:flex w-9 h-9 rounded-xl bg-primary items-center justify-center">
            <School className="w-5 h-5 text-on-primary" />
          </div>
          <span className="text-lg font-bold text-primary">مدرسه العامريه الحكومية بنين</span>
        </a>
        <div className="hidden md:flex items-center gap-8">
          <a href="#hero" className={`relative text-sm font-semibold transition-colors ${active === 'hero' ? 'text-primary' : 'text-secondary hover:text-primary'}`}>
            {t('nav.home')}
            <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-primary transition-transform duration-300" style={{ transform: `scaleX(${active === 'hero' ? 1 : 0})`, transformOrigin: 'left' }} />
          </a>
          <a href="#about" className={`relative text-sm font-semibold transition-colors ${active === 'about' ? 'text-primary' : 'text-secondary hover:text-primary'}`}>
            {t('nav.about')}
            <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-primary transition-transform duration-300" style={{ transform: `scaleX(${active === 'about' ? 1 : 0})`, transformOrigin: 'left' }} />
          </a>
          <a href="#events" className={`relative text-sm font-semibold transition-colors ${active === 'events' ? 'text-primary' : 'text-secondary hover:text-primary'}`}>
            {t('nav.events')}
            <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-primary transition-transform duration-300" style={{ transform: `scaleX(${active === 'events' ? 1 : 0})`, transformOrigin: 'left' }} />
          </a>
          <a href="#contact" className={`relative text-sm font-semibold transition-colors ${active === 'contact' ? 'text-primary' : 'text-secondary hover:text-primary'}`}>
            {t('nav.contact')}
            <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-primary transition-transform duration-300" style={{ transform: `scaleX(${active === 'contact' ? 1 : 0})`, transformOrigin: 'left' }} />
          </a>
          {regSection?.visible && (
            <a href="#registration" className={`relative text-sm font-semibold transition-colors ${active === 'registration' ? 'text-primary' : 'text-secondary hover:text-primary'}`}>
              {t('nav.register')}
              <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-primary transition-transform duration-300" style={{ transform: `scaleX(${active === 'registration' ? 1 : 0})`, transformOrigin: 'left' }} />
            </a>
          )}
        </div>
        <div className="hidden md:flex items-center gap-2">
          <button onClick={toggle} className="p-2.5 rounded-xl text-secondary hover:text-primary hover:bg-surface-container-low/50 backdrop-blur-sm transition-all" title={theme === 'light' ? t('nav.darkMode') : t('nav.lightMode')}>
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
          {user ? (
            <Link to={user.role === 'parent' ? '/parent' : user.role === 'student' ? '/student' : '/admin'} className="px-5 py-2 bg-primary text-on-primary rounded-xl text-sm font-semibold hover:bg-primary-container transition-all shadow-md">
              {t('nav.dashboard')}
            </Link>
          ) : (
            <Link to="/login" className="px-5 py-2 bg-primary text-on-primary rounded-xl text-sm font-semibold hover:bg-primary-container transition-all shadow-md">
              {t('nav.login')}
            </Link>
          )}
        </div>
        <div className="md:hidden flex items-center gap-2">
          <button className="p-2 text-secondary" onClick={() => setOpen(!open)}>
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-outline-variant bg-surface-container-lowest/80 backdrop-blur-xl px-4 py-4 space-y-3">
          <a href="#hero" onClick={() => setOpen(false)} className={`relative block text-sm font-semibold py-1 transition-colors ${active === 'hero' ? 'text-primary' : 'text-secondary hover:text-primary'}`}>
            {t('nav.home')}
          </a>
          <a href="#about" onClick={() => setOpen(false)} className={`relative block text-sm font-semibold py-1 transition-colors ${active === 'about' ? 'text-primary' : 'text-secondary hover:text-primary'}`}>
            {t('nav.about')}
          </a>
          <a href="#events" onClick={() => setOpen(false)} className={`relative block text-sm font-semibold py-1 transition-colors ${active === 'events' ? 'text-primary' : 'text-secondary hover:text-primary'}`}>
            {t('nav.events')}
          </a>
          <a href="#contact" onClick={() => setOpen(false)} className={`relative block text-sm font-semibold py-1 transition-colors ${active === 'contact' ? 'text-primary' : 'text-secondary hover:text-primary'}`}>
            {t('nav.contact')}
          </a>
          {regSection?.visible && (
            <a href="#registration" onClick={() => setOpen(false)} className={`relative block text-sm font-semibold py-1 transition-colors ${active === 'registration' ? 'text-primary' : 'text-secondary hover:text-primary'}`}>
              {t('nav.register')}
            </a>
          )}
          <div className="pt-2 border-t border-outline">
            <button onClick={toggle} className="flex items-center gap-2 w-full text-sm font-semibold py-2 text-secondary hover:text-primary transition-colors">
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              {theme === 'light' ? t('nav.darkMode') : t('nav.lightMode')}
            </button>
          </div>
          <div className="pt-2 border-t border-outline">
            {user ? (
              <Link to={user.role === 'parent' ? '/parent' : user.role === 'student' ? '/student' : '/admin'} onClick={() => setOpen(false)} className="block text-center px-5 py-2 bg-primary text-on-primary rounded-xl text-sm font-semibold">{t('nav.dashboard')}</Link>
            ) : (
              <Link to="/login" onClick={() => setOpen(false)} className="block text-center px-5 py-2 bg-primary text-on-primary rounded-xl text-sm font-semibold">{t('nav.login')}</Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
