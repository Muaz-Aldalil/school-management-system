import { NavLink } from 'react-router-dom';
import { School, LayoutDashboard, Users, Wallet, Settings, Palette, LogOut, UserCog, Key, Clock, FileBarChart, Bell, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useSchool } from '../context/SchoolContext';
import { DEFAULT_SCHOOL_NAME } from '../lib/constants';
import RoleGate from './RoleGate';

export default function Sidebar({ open, onClose }) {
  const { user, signOut } = useAuth();
  const { t, dir } = useLanguage();
  const { isSupervisor, isAccountant } = useSchool();
  const showPayments = user?.role === 'admin' || isSupervisor || isAccountant;

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
      isActive
        ? 'bg-primary/10 text-primary'
        : 'text-secondary hover:bg-surface-container-low/50 backdrop-blur-sm'
    }`;

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={onClose} />}
      <aside aria-label={t('sidebar.managementSystem')} className={`fixed start-0 top-0 z-40 h-screen w-[280px] bg-surface-container-lowest/60 backdrop-blur-xl border-e border-outline-variant flex flex-col py-6 transition-transform duration-200 md:translate-x-0 ${open ? 'translate-x-0' : dir === 'rtl' ? 'translate-x-full' : '-translate-x-full'}`}>
        <NavLink to="/admin" className="px-6 pb-6 flex items-center gap-3" onClick={onClose}>
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <School className="w-5 h-5 text-on-primary" />
          </div>
          <div>
            <h1 className="text-headline-md font-bold text-primary">{DEFAULT_SCHOOL_NAME}</h1>
            <p className="text-caption-xs text-secondary">{t('sidebar.managementSystem')}</p>
          </div>
        </NavLink>
        <nav className="flex-1 px-3 space-y-1">
          <NavLink to="/admin" end onClick={onClose} className={linkClass}>
            <LayoutDashboard className="w-5 h-5" /> {t('sidebar.dashboard')}
          </NavLink>
          <NavLink to="/admin/students" onClick={onClose} className={linkClass}>
            <Users className="w-5 h-5" /> {t('sidebar.students')}
          </NavLink>
          {showPayments && (
            <NavLink to="/admin/payments" onClick={onClose} className={linkClass}>
              <Wallet className="w-5 h-5" /> {t('sidebar.payments')}
            </NavLink>
          )}
          <RoleGate roles={['admin']}>
            <NavLink to="/admin/settings" onClick={onClose} className={linkClass}>
              <Settings className="w-5 h-5" /> {t('sidebar.settings')}
            </NavLink>
          </RoleGate>
          {(user?.role === 'admin' || isSupervisor || isAccountant) && (
            <NavLink to="/admin/pending" onClick={onClose} className={linkClass}>
              <Clock className="w-5 h-5" /> {t('sidebar.pending')}
            </NavLink>
          )}
          {(user?.role === 'admin' || isSupervisor) && (
            <NavLink to="/admin/users" onClick={onClose} className={linkClass}>
              <UserCog className="w-5 h-5" /> {t('sidebar.users')}
            </NavLink>
          )}
          <RoleGate roles={['admin']}>
            <NavLink to="/admin/invitations" onClick={onClose} className={linkClass}>
              <Key className="w-5 h-5" /> {t('sidebar.invitations')}
            </NavLink>
          </RoleGate>
          <RoleGate roles={['admin']}>
            <NavLink to="/admin/landing" onClick={onClose} className={linkClass}>
              <Palette className="w-5 h-5" /> {t('sidebar.manageLanding')}
            </NavLink>
          </RoleGate>
          <RoleGate roles={['admin']}>
            <NavLink to="/admin/reports" onClick={onClose} className={linkClass}>
              <FileBarChart className="w-5 h-5" /> {t('sidebar.reports')}
            </NavLink>
          </RoleGate>
          <RoleGate roles={['admin']}>
            <NavLink to="/admin/notifications" onClick={onClose} className={linkClass}>
              <Bell className="w-5 h-5" /> {t('sidebar.notifications')}
            </NavLink>
          </RoleGate>
          <RoleGate roles={['admin']}>
            <NavLink to="/admin/registrations" onClick={onClose} className={linkClass}>
              <UserPlus className="w-5 h-5" /> {t('sidebar.registrations')}
            </NavLink>
          </RoleGate>
        </nav>
        <div className="px-3 mt-auto pt-4 border-t border-outline-variant space-y-1">
          <NavLink to="/" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-secondary hover:bg-surface-container-low/50 backdrop-blur-sm transition-colors text-sm font-semibold" onClick={onClose}>
            <School className="w-5 h-5" />
            <span>{t('sidebar.viewSite')}</span>
          </NavLink>
          <button onClick={() => { signOut(); onClose?.(); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-secondary hover:bg-surface-container-low/50 backdrop-blur-sm transition-colors text-sm font-semibold text-start">
            <LogOut className="w-5 h-5" />
            <span>{t('sidebar.logout')}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
