import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Menu, X, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNotifications } from '../hooks/useNotifications';
import { formatDate, formatTime } from '../lib/utils';
import useTheme from '../hooks/useTheme';

export default function TopBar({ onMenuClick }) {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const { notifications, markRead, refetch } = useNotifications(20);

  useEffect(() => {
    if (!showDropdown) return;
    const interval = setInterval(refetch, 30000);
    return () => clearInterval(interval);
  }, [showDropdown, refetch]);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
    };
    if (showDropdown) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showDropdown]);

  const markReadHandler = async (id) => {
    markRead(id);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="fixed top-0 end-0 z-20 h-16 w-full md:w-[calc(100%-280px)] bg-surface-container-lowest/60 backdrop-blur-xl border-b border-outline-variant flex items-center justify-between px-4 md:px-6 gap-4">
      <button aria-label={t('sidebar.dashboard')} className="md:hidden text-on-surface-variant p-2 -ms-2" onClick={onMenuClick}>
        <Menu className="w-5 h-5" />
      </button>
        <div className="flex-1 max-w-md">
          <form onSubmit={e => { e.preventDefault(); if (search.trim()) navigate('/admin/students?q=' + encodeURIComponent(search.trim())); }}>
            <div className="relative flex items-center bg-surface-container-low/60 backdrop-blur-sm rounded-full px-4 py-2 focus-within:ring-2 focus-within:ring-primary transition-all">
              <Search className="w-4 h-4 text-on-surface-variant me-2" />
              <input className="bg-transparent border-none outline-none w-full text-sm text-on-surface placeholder:text-outline" placeholder={t('topBar.search')} type="text" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </form>
      </div>
      <div className="flex items-center gap-4 relative" ref={dropdownRef}>
        <button onClick={toggle} aria-label={theme === 'light' ? t('nav.darkMode') : t('nav.lightMode')} className="p-2 rounded-xl text-secondary hover:text-primary hover:bg-surface-container-low/50 transition-all" title={theme === 'light' ? t('nav.darkMode') : t('nav.lightMode')}>
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>
        <button aria-label={t('topBar.notifications')} className="relative text-on-surface-variant hover:bg-surface-container-low/50 backdrop-blur-sm p-2 rounded-full transition-colors" onClick={() => setShowDropdown(v => !v)}>
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -end-0.5 min-w-[18px] h-[18px] px-[4px] bg-error text-on-error text-[10px] font-bold rounded-full flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </button>

        {showDropdown && (
          <div className="absolute top-full end-0 mt-2 w-80 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant overflow-hidden z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
              <p className="text-sm font-semibold text-on-background">{t('topBar.notifications')}</p>
              <button aria-label={t('registrations.close')} className="text-secondary hover:text-on-background transition-colors" onClick={() => setShowDropdown(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-sm text-secondary p-6 text-center">{t('topBar.noNotifications')}</p>
              ) : notifications.map(n => (
                <div key={n.id} className={`px-4 py-3 border-b border-outline-variant/50 hover:bg-surface-container-low transition-colors ${!n.read ? 'bg-primary/[0.03] border-s-2 border-s-primary' : ''}`}>
                  <p className="text-sm text-on-background leading-relaxed">{n.message}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[11px] text-secondary">{formatDate(n.created_at, lang)} {formatTime(n.created_at, lang)}</span>
                    {!n.read && (
                      <button onClick={() => markReadHandler(n.id)} className="text-[11px] font-medium text-primary hover:underline py-1">{t('topBar.markRead')}</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="hidden sm:block text-end">
            <p className="text-sm font-semibold text-on-background leading-tight">{user?.name || t('topBar.admin')}</p>
            <p className="text-caption-xs text-secondary capitalize">{user?.role || 'admin'}</p>
          </div>
          <div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant bg-primary text-on-primary flex items-center justify-center text-xs font-bold shrink-0">
            {(user?.name || 'AD').split(' ').map(n => n[0]).join('')}
          </div>
        </div>
      </div>
    </header>
  );
}
