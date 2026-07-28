import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import WelcomeBanner from './WelcomeBanner';
import { useAutoLogout } from '../hooks/useAutoLogout';
import { useLanguage } from '../context/LanguageContext';
import SEO from './SEO';

export default function Layout() {
  useAutoLogout();
  const { t } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <SEO title={t('sidebar.managementSystem')} noindex />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col md:ms-[280px] min-w-0">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto pt-16">
          <WelcomeBanner />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
