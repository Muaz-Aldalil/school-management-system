import { useState, useEffect, useMemo, useRef, memo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useSchool } from '../context/SchoolContext';
import { useLanding } from '../context/LandingContext';
import { supabase, dbAvailable } from '../lib/supabase';
import { formatDate, formatTime, getScoreLabel, formatCurrency } from '../lib/utils';
import { localized } from '../lib/localized';
import { Users, UserCheck, AlertTriangle, GraduationCap, Trophy, MoreHorizontal, Mail, Star, BarChart3, PieChart, TrendingUp, TrendingDown, Minus, Percent, Target, Sparkles } from 'lucide-react';
import AnimatedCounter from '../components/AnimatedCounter';
import Sparkline from '../components/Sparkline';
import Reveal from '../components/Reveal';

// ponytail: lightweight section error boundary — one per section, not one per chart
import { Component, useContext } from 'react';
import { LanguageContext } from '../context/LanguageContext';
class SectionBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) return (
      <LanguageContext.Consumer>
        {({ t }) => (
          <div className="bg-error/5 border border-error/20 rounded-xl p-4 text-center">
            <p className="text-sm text-error">{t('dashboard2.sectionFailed')}</p>
            <button onClick={() => this.setState({ error: null })} className="text-xs text-primary hover:underline mt-1">{t('errorBoundary.retry')}</button>
          </div>
        )}
      </LanguageContext.Consumer>
    );
    return this.props.children;
  }
}

export default function Dashboard() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { stats, payments, students, grades, loading, isSupervisor, isAccountant } = useSchool();
  const { teachers, honorBoard } = useLanding();
  const [notifications, setNotifications] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const snapshotSavedRef = useRef(false);
  const pending = payments.filter(p => p.status === 'Overdue' || p.status === 'Pending');
  const entries = honorBoard?.entries?.slice(0, 3) || [];
  const showPayments = user?.role === 'admin' || isSupervisor || isAccountant;

  // ponytail: memoize student lookup — O(n) once instead of O(n*m) per render
  const studentMap = useMemo(() => Object.fromEntries(students.map(s => [s.id, s])), [students]);

  // ponytail: fetch recent snapshots for sparklines + trends
  useEffect(() => {
    if (!dbAvailable || user?.role !== 'admin') return;
    supabase.from('dashboard_snapshots')
      .select('snapshot_date, snapshot_data')
      .order('snapshot_date', { ascending: false })
      .limit(7)
      .then(({ data }) => { if (data) setSnapshots(data); })
      .catch(() => {});
  }, [user?.role]);

  // ponytail: save today's snapshot once after data loads
  useEffect(() => {
    if (!dbAvailable || user?.role !== 'admin' || loading || snapshotSavedRef.current) return;
    if (stats.students === 0 && stats.collected === 0) return;
    snapshotSavedRef.current = true;
    const today = new Date().toISOString().slice(0, 10);
    const snapshot = {
      students: stats.students, active: stats.active, collected: stats.collected,
      totalExpected: stats.totalExpected, collectionRate: stats.collectionRate,
      avgGrade: stats.avgGrade, gradesCount: stats.gradesCount,
      pendingPayments: stats.pendingPayments, overdueCount: stats.overdueCount,
      paidCount: stats.paidCount, newThisMonth: stats.newThisMonth,
      faculty: teachers.length,
    };
    supabase.from('dashboard_snapshots')
      .upsert({ snapshot_date: today, snapshot_data: snapshot }, { onConflict: 'snapshot_date' })
      .then(() => {}).catch(() => {});
  }, [loading, stats, teachers.length, user?.role]);

  // ponytail: compute trend data from snapshots
  const trends = useMemo(() => {
    if (snapshots.length < 2) return {};
    const curr = snapshots[0]?.snapshot_data || {};
    const prev = snapshots[1]?.snapshot_data || {};
    const delta = (key) => {
      const c = curr[key] ?? 0, p = prev[key] ?? 0;
      if (c > p) return { dir: 'up', diff: c - p };
      if (c < p) return { dir: 'down', diff: p - c };
      return { dir: 'same', diff: 0 };
    };
    return {
      students: delta('students'), collected: delta('collected'),
      collectionRate: delta('collectionRate'), avgGrade: delta('avgGrade'),
      pendingPayments: delta('pendingPayments'), newThisMonth: delta('newThisMonth'),
      active: delta('active'),
    };
  }, [snapshots]);

  // ponytail: sparkline data arrays (oldest first)
  const sparkData = useMemo(() => {
    if (snapshots.length < 2) return {};
    const sorted = [...snapshots].reverse();
    const extract = (key) => sorted.map(s => s.snapshot_data?.[key] ?? 0);
    return {
      students: extract('students'), collected: extract('collected'),
      collectionRate: extract('collectionRate'), avgGrade: extract('avgGrade'),
      pendingPayments: extract('pendingPayments'), newThisMonth: extract('newThisMonth'),
      active: extract('active'),
    };
  }, [snapshots]);

  useEffect(() => {
    if (!dbAvailable) return;
    supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(5).then(({ data }) => {
      if (data) setNotifications(data);
    }).catch(() => {});
  }, []);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <Reveal>
        <h2 className="text-headline-md text-on-background">{t('dashboard.title')}</h2>
        <p className="text-body-md text-secondary mt-1">{t('dashboard.adminSubtitle')}</p>
        {user?.name && (
          <p className="text-sm text-primary font-semibold mt-2">
            {t('auth.welcomeBack')}, {user.name}
          </p>
        )}
        {user?.role === 'teacher' && <p className="text-xs text-secondary mt-2">{t('dashboard.teacherInfo')}</p>}
        {user?.role === 'accountant' && <p className="text-xs text-secondary mt-2">{t('dashboard.accountantInfo')}</p>}
        {user?.role === 'supervisor' && <p className="text-xs text-secondary mt-2">{t('dashboard.supervisorInfo')}</p>}
      </Reveal>

      <Reveal delay={0.1}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          <StatCard icon={Users} label={t('dashboard.totalStudents')} value={stats.students} trend={trends.students} sparkline={sparkData.students} color="primary" loading={loading} decimals={0} />
          <StatCard icon={UserCheck} label={t('dashboard.activeStudents')} value={stats.active} trend={trends.active} sparkline={sparkData.active} color="secondary" loading={loading} decimals={0} />
          <StatCard icon={Sparkles} label={t('dashboard2.newThisMonth')} value={stats.newThisMonth} trend={trends.newThisMonth} sparkline={sparkData.newThisMonth} color="tertiary" loading={loading} decimals={0} />
          <StatCard icon={GraduationCap} label={t('dashboard.faculty')} value={teachers.length} color="secondary" loading={loading} decimals={0} />
          {showPayments && <StatCard icon={AlertTriangle} label={t('dashboard.pendingPayments')} value={stats.pendingPayments} trend={trends.pendingPayments} sparkline={sparkData.pendingPayments} color="error" loading={loading} decimals={0} />}
          {showPayments && <StatCard icon={Percent} label={t('dashboard2.collectionRate')} value={stats.collectionRate} suffix="%" trend={trends.collectionRate} sparkline={sparkData.collectionRate} color={stats.collectionRate >= 80 ? 'success' : stats.collectionRate >= 50 ? 'warning' : 'error'} loading={loading} decimals={0} />}
          {showPayments && <StatCard icon={Target} label={t('dashboard2.avgGrade')} value={stats.avgGrade} suffix="/100" trend={trends.avgGrade} sparkline={sparkData.avgGrade} color={stats.avgGrade >= 85 ? 'success' : stats.avgGrade >= 70 ? 'warning' : 'error'} loading={loading} decimals={0} />}
        </div>
      </Reveal>

      <Reveal delay={0.15}>
        <SectionBoundary>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {showPayments && <ChartCard icon={BarChart3} title={t('dashboard.paymentCollection')} subtitle={formatCurrency(stats.collected, 'SDG', t)}>
              <PaymentChart payments={payments} t={t} />
            </ChartCard>}
            <ChartCard icon={PieChart} title={t('dashboard.gradeDistribution')} subtitle={`${grades.length} ${t('dashboard2.gradesRecorded')}`}>
              <GradeChart grades={grades} t={t} />
            </ChartCard>
          </div>
        </SectionBoundary>
      </Reveal>

      {showPayments && <Reveal delay={0.2}>
        <SectionBoundary>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col">
            <div className="p-4 border-b border-outline-variant flex items-center justify-between">
              <h3 className="text-headline-md text-on-background">{t('dashboard.recentPayments')}</h3>
              <button className="text-primary hover:bg-surface-container-low p-1 rounded-full"><MoreHorizontal className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3 flex-1">
              {payments.slice(-5).reverse().map(p => {
                const s = studentMap[p.studentId];
                const initials = s ? (s.name.split(' ')[0]?.[0] || '?') : '??';
                return (
                  <div key={p.id} className="flex items-center justify-between hover:bg-surface-container-low p-2 rounded-lg transition-colors -mx-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-xs font-bold text-on-surface-variant">{initials}</div>
                      <div>
                        <p className="text-sm font-semibold text-on-background">{s?.name || 'Unknown'}</p>
                        <p className="text-caption-xs text-secondary">{p.dueDate}</p>
                      </div>
                    </div>
                    <div className="text-end">
                      <p className="text-sm font-bold text-on-background">{formatCurrency(p.amount, 'SDG', t)}</p>
                      <span className={`text-caption-xs px-2 py-0.5 rounded-full ${p.status === 'Paid' ? 'text-tertiary bg-tertiary/10' : p.status === 'Overdue' ? 'text-error bg-error/10' : 'text-secondary bg-secondary/10'}`}>{t('dashboard.' + p.status.toLowerCase())}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-3 border-t border-outline-variant text-center">
              <Link to="/admin/payments" className="text-sm text-primary hover:underline">{t('dashboard.viewAll')}</Link>
            </div>
          </div>
          <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
            <div className="p-4 border-b border-outline-variant flex items-center justify-between bg-surface-bright">
              <h3 className="text-headline-md text-on-background">{t('dashboard.upcomingDue')}</h3>
              <button className="px-3 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-semibold hover:bg-primary-container transition-colors">{t('dashboard.sendReminders')}</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-start">
                <thead>
                  <tr className="border-b border-outline-variant text-xs font-semibold text-secondary uppercase">
                    <th className="px-4 py-3">{t('dashboard.student')}</th>
                    <th className="px-4 py-3">{t('dashboard.amount')}</th>
                    <th className="px-4 py-3">{t('dashboard.dueDate')}</th>
                    <th className="px-4 py-3">{t('dashboard.status')}</th>
                    <th className="px-4 py-3 text-end">{t('dashboard.action')}</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {pending.map(p => (
                    <tr key={p.id} className="border-b border-surface-container-highest hover:bg-surface-container-low transition-colors group">
                      <td className="px-4 py-4 font-semibold text-on-background">{studentMap[p.studentId]?.name || p.student || 'Unknown'}</td>
                      <td className="px-4 py-4">{formatCurrency(p.amount, 'SDG', t)}</td>
                      <td className="px-4 py-4 text-on-surface-variant">{p.dueDate}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${p.status === 'Overdue' ? 'bg-error/10 text-error' : 'bg-secondary/10 text-secondary'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'Overdue' ? 'bg-error' : 'bg-secondary'}`} />
                          {t('dashboard.' + p.status.toLowerCase())}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-end">
                        <button className="text-primary hover:bg-primary/10 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          <Mail className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        </SectionBoundary>
      </Reveal>}

      <Reveal delay={0.3}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl">
            <div className="p-4 border-b border-outline-variant">
              <h3 className="text-headline-md text-on-background">{t('dashboard.recentActivity')}</h3>
            </div>
            <div className="p-4 space-y-3 max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-sm text-secondary py-2">{t('dashboard.noRecentActivity')}</p>
              ) : notifications.map(n => (
                <div key={n.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-surface-container-low transition-colors -mx-2">
                  <span className="text-lg shrink-0 mt-0.5">🎉</span>
                  <div className="min-w-0">
                    <p className="text-sm text-on-background leading-relaxed">{n.message}</p>
                    <p className="text-caption-xs text-secondary mt-0.5">{formatDate(n.created_at, lang)} {t('dashboard.at')} {formatTime(n.created_at, lang)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl">
            <div className="p-4 border-b border-outline-variant flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <h3 className="text-headline-md text-on-background">{t('dashboard.topPerformers')}</h3>
            </div>
            <div className="p-4 space-y-3">
              {entries.length === 0 ? (
                <p className="text-sm text-secondary py-2">{t('dashboard.noHonorBoard')}</p>
              ) : entries.map((e, i) => (
                <div key={localized(e.name, lang) + i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-container-low transition-colors -mx-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? 'bg-yellow-500/15 text-yellow-600' : i === 1 ? 'bg-gray-400/15 text-gray-500' : 'bg-amber-600/15 text-amber-700'}`}>
                    {localized(e.name, lang).split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-on-background truncate">{localized(e.name, lang)}</p>
                      <span className="text-[10px] font-medium text-secondary bg-surface-container-high px-1.5 py-0.5 rounded shrink-0">{e.grade}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex gap-0.5">
                        {[...Array(3 - i)].map((_, j) => <Star key={j} className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" />)}
                      </div>
                      <span className="text-xs text-primary font-semibold">{e.score}%</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${i === 0 ? 'bg-yellow-500/10 text-yellow-600' : i === 1 ? 'bg-gray-400/10 text-gray-500' : 'bg-amber-600/10 text-amber-700'}`}>
                    {t(BADGES_KEYS[i])}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

const BADGES_KEYS = ['dashboard2.first', 'dashboard2.second', 'dashboard2.third'];

function ChartCard({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-on-background">{title}</h3>
      </div>
      <p className="text-caption-xs text-secondary mb-3">{subtitle}</p>
      {children}
    </div>
  );
}

const PaymentChart = memo(function PaymentChart({ payments, t }) {
  const paid = payments.filter(p => p.status === 'Paid').reduce((s, p) => s + p.amount, 0);
  const pending = payments.filter(p => p.status === 'Pending').reduce((s, p) => s + p.amount, 0);
  const overdue = payments.filter(p => p.status === 'Overdue').reduce((s, p) => s + p.amount, 0);
  const total = paid + pending + overdue || 1;
  return (
    <svg viewBox="0 0 200 130" className="w-full max-w-[220px] mx-auto">
      {[
        { label: t('dashboard.paid'), v: paid, c: '#059669' },
        { label: t('dashboard.pending'), v: pending, c: '#6366f1' },
        { label: t('dashboard.overdue'), v: overdue, c: '#dc2626' },
      ].map((d, i) => (
        <g key={d.label}>
          <rect x="10" y={10 + i * 28} width="160" height="20" rx="4" fill="#f1f5f9" />
          <rect x="10" y={10 + i * 28} width={(d.v / total) * 160} height="20" rx="4" fill={d.c} opacity="0.8" />
          <text x="10" y={10 + i * 28 + 14} fontSize="9" fill="#fff" fontWeight="600">{d.label}</text>
        </g>
      ))}
      <text x="10" y="100" fontSize="9" fill="#64748b">{formatCurrency(paid, 'SDG', t)} {t('dashboard.paid')} &middot; {formatCurrency(pending, 'SDG', t)} {t('dashboard.pending')} &middot; {formatCurrency(overdue, 'SDG', t)} {t('dashboard.overdue')}</text>
    </svg>
  );
});

const GradeChart = memo(function GradeChart({ grades, t }) {
  const counts = {};
  grades.forEach(g => {
    const label = getScoreLabel(g.score, t);
    if (label) counts[label] = (counts[label] || 0) + 1;
  });
  const gradeLabels = [t('grades.excellent'), t('grades.veryGood'), t('grades.good'), t('grades.pass'), t('grades.fail')];
  const colors = ['#059669', '#6366f1', '#f59e0b', '#f97316', '#dc2626'];
  const activeLabels = gradeLabels.filter(l => counts[l]);
  const total = grades.length || 1;
  let cur = -90;
  const slices = gradeLabels.map((l, i) => {
    const v = counts[l] || 0;
    const pct = v / total;
    if (v === 0) return null;
    const a1 = (cur * Math.PI) / 180;
    const a2 = ((cur + pct * 360) * Math.PI) / 180;
    cur += pct * 360;
    const x1 = 60 + 40 * Math.cos(a1);
    const y1 = 50 + 40 * Math.sin(a1);
    const x2 = 60 + 40 * Math.cos(a2);
    const y2 = 50 + 40 * Math.sin(a2);
    return (
      <g key={l}>
        <path d={`M60,50 L${x1},${y1} A40,40 0 ${pct > 0.5 ? 1 : 0} 1 ${x2},${y2} Z`} fill={colors[i]} opacity="0.8" />
      </g>
    );
  });
  return (
    <svg viewBox="0 0 200 100" className="w-full max-w-[220px] mx-auto">
      {slices}
      {activeLabels.map((l, i) => (
        <g key={`leg-${l}`}>
          <rect x="120" y={8 + i * 16} width="8" height="8" rx="2" fill={colors[gradeLabels.indexOf(l)]} opacity="0.8" />
          <text x="132" y={15 + i * 16} fontSize="9" fill="#64748b">{l} ({counts[l]})</text>
        </g>
      ))}
    </svg>
  );
});
function StatCard({ icon: Icon, label, value, trend, sparkline, color, loading, decimals = 0, prefix = '', suffix = '' }) {
  const { t } = useContext(LanguageContext);
  const colorMap = {
    primary: { bg: 'bg-primary/5', icon: 'text-primary', ring: 'ring-primary/20' },
    secondary: { bg: 'bg-secondary/10', icon: 'text-secondary', ring: 'ring-secondary/20' },
    tertiary: { bg: 'bg-tertiary/10', icon: 'text-tertiary', ring: 'ring-tertiary/20' },
    error: { bg: 'bg-error/10', icon: 'text-error', ring: 'ring-error/20' },
    success: { bg: 'bg-green-500/10', icon: 'text-green-600', ring: 'ring-green-500/20' },
    warning: { bg: 'bg-amber-500/10', icon: 'text-amber-600', ring: 'ring-amber-500/20' },
  };
  const c = colorMap[color] || colorMap.primary;
  const TrendIcon = trend?.dir === 'up' ? TrendingUp : trend?.dir === 'down' ? TrendingDown : Minus;
  const trendColor = trend?.dir === 'up' ? 'text-green-600 bg-green-500/10' : trend?.dir === 'down' ? 'text-red-600 bg-red-500/10' : 'text-secondary bg-secondary/10';

  if (loading) {
    return (
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col justify-between animate-pulse">
        <div className="flex items-center justify-between mb-3">
          <div className="h-3 w-16 bg-surface-container-highest rounded" />
          <div className={`h-9 w-9 rounded-lg ${c.bg}`} />
        </div>
        <div className="h-8 w-14 bg-surface-container-highest rounded mb-1" />
        <div className="h-2 w-10 bg-surface-container-highest rounded" />
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-secondary truncate pe-1">{label}</span>
        <div className={`p-1.5 rounded-lg ${c.bg} ring-1 ${c.ring}`}><Icon className={`w-4 h-4 ${c.icon}`} /></div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-2xl font-bold text-on-background">
          <AnimatedCounter value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
        </span>
        {sparkline && sparkline.length >= 2 && (
          <Sparkline data={sparkline} color={c.icon.includes('green') ? '#16a34a' : c.icon.includes('amber') ? '#d97706' : c.icon.includes('error') || c.icon.includes('red') ? '#dc2626' : '#6366f1'} width={48} height={20} />
        )}
      </div>
      {trend && (
        <div className="flex items-center gap-1 mt-1">
          <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${trendColor}`}>
            <TrendIcon className="w-2.5 h-2.5" />
            {trend.dir === 'same' ? '0' : trend.diff}
          </span>
          <span className="text-[10px] text-secondary">{t('dashboard2.vsYesterday')}</span>
        </div>
      )}
    </div>
  );
}
