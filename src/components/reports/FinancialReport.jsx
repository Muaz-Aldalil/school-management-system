import { useSchool } from '../../context/SchoolContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency, formatDateSD } from '../../lib/utils';

export default function FinancialReport() {
  const { t } = useLanguage();
  const { payments, schoolInfo } = useSchool();

  const collected = payments.filter(p => p.status === 'Paid').reduce((s, p) => s + p.amount, 0);
  const pending = payments.filter(p => p.status === 'Pending').reduce((s, p) => s + p.amount, 0);
  const overdue = payments.filter(p => p.status === 'Overdue').reduce((s, p) => s + p.amount, 0);
  const total = collected + pending + overdue;
  const rate = total > 0 ? Math.round((collected / total) * 100) : 0;

  const byMethod = {};
  payments.filter(p => p.status === 'Paid').forEach(p => {
    const m = p.method || 'cash';
    if (!byMethod[m]) byMethod[m] = 0;
    byMethod[m] += p.amount;
  });

  const methodLabels = { cash: t('paymentMethods.cash'), bank_transfer: t('paymentMethods.bankTransfer'), mobile_money: t('paymentMethods.mobileMoney'), other: t('paymentMethods.other') };

  return (
    <div className="space-y-6">
      <div className="text-center border-b-2 border-on-surface pb-4">
        <p className="text-sm text-secondary">{t('ministry.ministryHeader')}</p>
        <h2 className="text-xl font-bold text-on-surface mt-1">{t('ministry.officialReport')}</h2>
        <p className="text-sm font-semibold text-primary mt-1">{t('ministry.financial')}</p>
      </div>

      <div className="grid grid-cols-4 gap-4 text-center">
        <div className="bg-surface-container-low rounded-lg p-4">
          <p className="text-xl font-bold text-tertiary">{formatCurrency(collected, 'SDG')}</p>
          <p className="text-xs text-secondary">{t('ministry.totalCollected')}</p>
        </div>
        <div className="bg-surface-container-low rounded-lg p-4">
          <p className="text-xl font-bold text-secondary">{formatCurrency(pending, 'SDG')}</p>
          <p className="text-xs text-secondary">{t('ministry.totalPending')}</p>
        </div>
        <div className="bg-surface-container-low rounded-lg p-4">
          <p className="text-xl font-bold text-error">{formatCurrency(overdue, 'SDG')}</p>
          <p className="text-xs text-secondary">{t('ministry.totalOverdue')}</p>
        </div>
        <div className="bg-surface-container-low rounded-lg p-4">
          <p className="text-xl font-bold text-primary">{rate}%</p>
          <p className="text-xs text-secondary">{t('ministry.collectionRate')}</p>
        </div>
      </div>

      <div>
        <h3 className="font-bold text-sm mb-2">{t('ministry.byMethod')}</h3>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-surface-container-high">
              <th className="border border-outline-variant px-3 py-2 text-start">{t('ministry.byMethod')}</th>
              <th className="border border-outline-variant px-3 py-2 text-center">{t('common.amount')}</th>
              <th className="border border-outline-variant px-3 py-2 text-center">%</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(byMethod).sort((a, b) => b[1] - a[1]).map(([method, amount]) => (
              <tr key={method} className="hover:bg-surface-container-low">
                <td className="border border-outline-variant px-3 py-2">{methodLabels[method] || method}</td>
                <td className="border border-outline-variant px-3 py-2 text-center">{formatCurrency(amount, 'SDG')}</td>
                <td className="border border-outline-variant px-3 py-2 text-center">{collected > 0 ? Math.round((amount / collected) * 100) : 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-secondary text-start pt-4 border-t border-outline-variant">
        {t('ministry.generatedBy')} {schoolInfo?.schoolName || t('ministry.alAmiriya')} — {formatDateSD(new Date())}
      </div>
    </div>
  );
}
