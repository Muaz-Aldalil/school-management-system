import { useState } from 'react';
import { Printer, FileText, BarChart3, Wallet, Clock } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import Reveal from '../../components/Reveal';
import EnrollmentReport from '../../components/reports/EnrollmentReport';
import GradeReport from '../../components/reports/GradeReport';
import FinancialReport from '../../components/reports/FinancialReport';
import AttendanceReport from '../../components/reports/AttendanceReport';

const TABS = [
  { key: 'enrollment', icon: FileText },
  { key: 'grades', icon: BarChart3 },
  { key: 'financial', icon: Wallet },
  { key: 'attendance', icon: Clock },
];

export default function MinistryReports() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('enrollment');

  const reportMap = {
    enrollment: <EnrollmentReport />,
    grades: <GradeReport />,
    financial: <FinancialReport />,
    attendance: <AttendanceReport />,
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6 print:p-0 print:max-w-none">
      <Reveal>
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-headline-md text-on-background font-bold">{t('ministry.title')}</h2>
            <p className="text-body-md text-secondary mt-1">{t('ministry.subtitle')}</p>
          </div>
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors shadow-sm no-print">
            <Printer className="w-4 h-4" />
            {t('ministry.print')}
          </button>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="flex gap-2 overflow-x-auto no-print">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-low text-secondary hover:bg-surface-container-lowest'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t('ministry.' + tab.key)}
              </button>
            );
          })}
        </div>
      </Reveal>

      <Reveal delay={0.2}>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm print:shadow-none print:border-0 print:p-0">
          {reportMap[activeTab]}
        </div>
      </Reveal>
    </div>
  );
}
