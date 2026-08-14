import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSchool } from '../context/SchoolContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { Wallet, Clock, AlertTriangle, Plus, Receipt, Eye, CheckCircle, Mail, Trash2 } from 'lucide-react';
import { getGradeLabel, formatCurrency } from '../lib/utils';
import Reveal from '../components/Reveal';
import Modal from '../components/Modal';

export default function Payments() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { payments, students, updatePaymentStatus, deletePayment, addPayment, isSupervisor, isAccountant } = useSchool();
  const toast = useToast();
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [deletingPayment, setDeletingPayment] = useState(null);
  const canEdit = user?.role === 'admin' || isSupervisor || isAccountant;
  const collected = payments.filter(p => p.status === 'Paid').reduce((s, p) => s + p.amount, 0);
  const pendingTotal = payments.filter(p => p.status === 'Pending').reduce((s, p) => s + p.amount, 0);
  const overdueTotal = payments.filter(p => p.status === 'Overdue').reduce((s, p) => s + p.amount, 0);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <Reveal>
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-headline-md text-on-background font-bold">{t('payments.title')}</h2>
            <p className="text-body-md text-secondary mt-1">{t('payments.subtitle')}</p>
          </div>
          {canEdit && <button onClick={() => setShowNewInvoice(true)} className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors shadow-sm">
            <Plus className="w-4 h-4" />
            {t('payments.newInvoice')}
          </button>}
        </div>
      </Reveal>
      <Reveal delay={0.1}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SummaryCard icon={Wallet} label={t('payments.collected')} value={formatCurrency(collected, 'SDG', t)} trend="+12%" trendUp bg="bg-tertiary/10" iconBg="bg-tertiary/10" />
            <SummaryCard icon={Clock} label={t('payments.pending')} value={formatCurrency(pendingTotal, 'SDG', t)} badge={t('payments.invoices', { count: payments.filter(p => p.status === 'Pending').length })} bg="bg-surface-container-lowest" iconBg="bg-secondary/30" />
          <SummaryCard icon={AlertTriangle} label={t('payments.overdue')} value={formatCurrency(overdueTotal, 'SDG', t)} trend="+5%" trendUp={false} bg="bg-surface-container-lowest" iconBg="bg-error/30" valueClass="text-error" />
        </div>
      </Reveal>
      <Reveal delay={0.2}>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-outline-variant flex items-center justify-between bg-surface-bright">
            <h3 className="text-headline-md text-on-surface">{t('payments.recentTransactions')}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant text-xs font-semibold text-secondary uppercase tracking-wider">
                  <th className="py-3 px-4">{t('common.student')}</th>
                  <th className="py-3 px-4">{t('common.amount')}</th>
                  <th className="py-3 px-4">{t('common.dueDate')}</th>
                  <th className="py-3 px-4">{t('common.status')}</th>
                  <th className="py-3 px-4 text-end">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {payments.length === 0 ? (
                  <tr><td colSpan="5" className="py-12 px-4 text-center text-secondary text-sm">{t('payments.noPayments')}</td></tr>
                ) : payments.map(p => (
                  <tr key={p.id} className="hover:bg-surface-container-low transition-colors group">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-xs font-bold text-secondary">
                          {(p.student || '??').split(' ')[0]?.[0] || '?'}
                        </div>
                        <p className="font-semibold text-on-surface">{p.student || `ID: ${p.studentId?.slice(0, 8)}`}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-semibold">{formatCurrency(p.amount, 'SDG', t)}</td>
                    <td className={`py-4 px-4 ${p.status === 'Overdue' ? 'text-error font-semibold' : 'text-secondary'}`}>{p.dueDate}</td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                        p.status === 'Paid' ? 'bg-tertiary/10 text-tertiary' :
                        p.status === 'Overdue' ? 'bg-error/10 text-error' :
                        'bg-secondary/10 text-secondary'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'Paid' ? 'bg-tertiary' : p.status === 'Overdue' ? 'bg-error' : 'bg-secondary'}`} />
                        {t('dashboard.' + p.status.toLowerCase())}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-end">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canEdit ? (
                          p.status === 'Paid' ? (
                            <button onClick={() => toast(t('payments.receiptComingSoon'))} className="p-1.5 text-secondary hover:text-primary rounded transition-colors"><Receipt className="w-4 h-4" /></button>
                          ) : (
                            <>
                              <button onClick={() => toast(t('payments.invoiceDetails'))} className="p-1.5 text-secondary hover:text-primary rounded transition-colors"><Eye className="w-4 h-4" /></button>
                               <button onClick={async () => { try { await updatePaymentStatus(p.id, 'Paid'); toast(t('payments.markedPaid')); } catch { toast(t('payments.failedToUpdate')); } }} className="p-1.5 text-secondary hover:text-tertiary rounded transition-colors"><CheckCircle className="w-4 h-4" /></button>
                              {p.status === 'Overdue' && <button onClick={() => toast(t('payments.reminderSent'))} className="p-1.5 text-secondary hover:text-primary rounded transition-colors"><Mail className="w-4 h-4" /></button>}
                            </>
                          )
                        ) : (
                          <button onClick={() => toast(t('payments.invoiceDetails'))} className="p-1.5 text-secondary hover:text-primary rounded transition-colors"><Eye className="w-4 h-4" /></button>
                        )}
                        {canEdit && <button onClick={() => setDeletingPayment(p)} className="p-1.5 text-secondary hover:text-error rounded transition-colors"><Trash2 className="w-4 h-4" /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {payments.length > 0 && (
            <div className="p-4 border-t border-outline-variant bg-surface-bright flex items-center justify-between text-xs text-secondary">
              <span>{t('payments.showing', { end: payments.length, total: payments.length })}</span>
            </div>
          )}
        </div>
      </Reveal>

      <Modal open={showNewInvoice} onClose={() => setShowNewInvoice(false)} title={t('payments.newTitle')}>
        <InvoiceForm students={students} onSubmit={async data => { try { await addPayment(data); setShowNewInvoice(false); toast(t('payments.created')); } catch { toast(t('payments.failedToCreate')); } }} onCancel={() => setShowNewInvoice(false)} />
      </Modal>
      <Modal open={!!deletingPayment} onClose={() => setDeletingPayment(null)} title={t('payments.deleteConfirm', { student: deletingPayment?.student || '', amount: deletingPayment?.amount || 0 })}>
        <div className="space-y-4">
          <p className="text-sm text-secondary">{t('payments.deleteConfirm', { student: deletingPayment?.student || '', amount: deletingPayment?.amount || 0 })}</p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDeletingPayment(null)} className="px-4 py-2 border border-outline-variant rounded-lg text-sm text-on-surface hover:bg-surface-container-low transition-colors">{t('common.cancel')}</button>
            <button onClick={async () => { try { await deletePayment(deletingPayment.id); toast(t('payments.deleted')); } catch { toast(t('payments.failedToDelete')); } setDeletingPayment(null); }} className="px-4 py-2 bg-error text-on-primary rounded-lg text-sm font-semibold hover:bg-error/90 transition-colors shadow-sm">{t('common.delete')}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, trend, trendUp = true, badge, bg, iconBg, valueClass }) {
  return (
    <div className={`${bg} border border-outline-variant rounded-xl p-4 flex flex-col shadow-sm`}>
      <div className="flex justify-between items-start mb-4">
        <div className={`w-10 h-10 rounded-full ${iconBg} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 ${trendUp ? 'text-tertiary bg-tertiary/10' : 'text-error bg-error/10'}`}>
            {trendUp ? '↑' : '↓'} {trend}
          </span>
        )}
        {badge && <span className="text-xs text-secondary bg-surface-container-highest px-2 py-1 rounded-full">{badge}</span>}
      </div>
      <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1">{label}</p>
      <h3 className={`text-3xl font-bold ${valueClass || 'text-on-surface'}`}>{value}</h3>
    </div>
  );
}

function InvoiceForm({ students, onSubmit, onCancel }) {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');

  const filtered = search.trim()
    ? students.filter(s => s.name.toLowerCase().includes(search.toLowerCase())).slice(0, 8)
    : [];

  const selectStudent = (s) => {
    setSelectedStudent(s);
    setSearch(s.name);
    setShowDropdown(false);
  };

  const submit = e => {
    e.preventDefault();
    if (!amount || !dueDate) return;
    if (selectedStudent) {
      onSubmit({ studentId: selectedStudent.id, student: selectedStudent.name, amount: Number(amount), dueDate });
    } else if (search.trim()) {
      onSubmit({ studentId: null, student: search.trim(), amount: Number(amount), dueDate });
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="relative">
        <label className="block text-xs font-semibold text-secondary mb-1">{t('common.student')}</label>
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setSelectedStudent(null); setShowDropdown(true); }}
          onFocus={() => { if (filtered.length) setShowDropdown(true); }}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          placeholder={t('students.search')}
          className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {showDropdown && filtered.length > 0 && (
          <div className="absolute z-50 mt-1 w-full bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {filtered.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => selectStudent(s)}
                className="w-full text-start px-3 py-2 text-sm hover:bg-surface-container-low transition-colors flex items-center justify-between"
              >
                <span className="font-medium text-on-surface">{s.name}</span>
                <span className="text-xs text-secondary">{getGradeLabel(s.grade)} — {s.class}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div>
        <label className="block text-xs font-semibold text-secondary mb-1">{t('payments.amountLabel')}</label>
        <input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-primary" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-secondary mb-1">{t('payments.dueDateLabel')}</label>
        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-primary" />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 border border-outline-variant rounded-lg text-sm text-on-surface hover:bg-surface-container-low transition-colors">{t('payments.cancel')}</button>
        <button type="submit" disabled={!amount || !dueDate || (!selectedStudent && !search.trim())} className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors shadow-sm disabled:opacity-50">{t('payments.createInvoice')}</button>
      </div>
    </form>
  );
}
