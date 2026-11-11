import { useEffect, useState } from 'react';
import { Activity, BookOpen, CalendarClock, CircleDollarSign, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, dataOf } from '../api/client';
import { Badge, StatCard } from '../components/shared';

const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) || 0);
const date = (value) => value ? new Date(value).toLocaleDateString() : '—';

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    api.get('/dashboard').then((response) => setDashboard(dataOf(response))).catch((failure) => setError(failure.response?.data?.message || 'Unable to load your dashboard.')).finally(() => setLoading(false));
  }, []);
  if (loading) return <div className="grid min-h-[50vh] place-items-center text-xs text-muted">Loading your learning overview…</div>;
  if (error) return <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700">{error}</div>;
  const summary = dashboard?.summary || {};
  const plan = dashboard?.plan;
  const activity = dashboard?.learningActivity || [];
  const peak = Math.max(1, ...activity.map((point) => point.count));
  return <div className="space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="font-display text-2xl font-extrabold">Welcome back{dashboard?.student?.fullName ? `, ${dashboard.student.fullName.split(' ')[0]}` : ''}</h1><p className="mt-1 text-xs text-muted">Here’s your learning and account overview.</p></div><Link to="/student/courses" className="rounded-lg bg-brand-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-700">Browse my courses</Link></header>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard title="My courses" value={summary.totalCourses ?? 0} icon={BookOpen} caption={`${summary.coursesCompleted ?? 0} completed`} />
      <StatCard title="Unpaid total" value={money(summary.unpaidTotal)} icon={CircleDollarSign} caption={summary.nextDueDate ? `Next due ${date(summary.nextDueDate)}` : 'No upcoming payments'} tone={summary.unpaidTotal ? 'amber' : 'success'} />
      <StatCard title="Total paid" value={money(summary.totalPaid)} icon={FileText} caption="Recorded invoice payments" tone="success" />
      <StatCard title="Active learning days" value={summary.activeDays ?? 0} icon={Activity} caption="Days with course activity" />
    </div>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,.8fr)]">
      <section className="overflow-hidden rounded-xl border border-line bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-line px-4 py-3"><div><h2 className="text-xs font-bold">Course progress</h2><p className="mt-1 text-[10px] text-muted">Continue where you left off.</p></div><Link to="/student/courses" className="text-[10px] font-bold text-brand-700">View all</Link></div>
        {dashboard?.courses?.length ? <div className="divide-y divide-slate-100">{dashboard.courses.map((course) => <Link key={course.id} to={`/student/courses/${course.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50"><span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-700"><BookOpen size={16} /></span><span className="min-w-0 flex-1"><b className="block truncate text-xs">{course.courseName}</b><span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-brand-600" style={{ width: `${course.progressPercent || 0}%` }} /></span></span><span className="text-[10px] font-bold text-muted">{course.progressPercent || 0}%</span></Link>)}</div> : <div className="p-8 text-center text-xs text-muted">No courses are available yet.</div>}
      </section>
      <section className="rounded-xl border border-line bg-white p-4 shadow-soft">
        <div className="flex items-center gap-2"><CalendarClock size={16} className="text-brand-600" /><h2 className="text-xs font-bold">My subscription</h2></div>
        {plan ? <><div className="mt-4 flex items-start justify-between gap-3"><div><p className="font-display text-lg font-extrabold">{plan.planName}</p><p className="mt-1 text-[10px] text-muted">{plan.billingCycle?.replace('_', ' ') || 'Subscription plan'}</p></div><Badge tone={['ACTIVE', 'TRIALING'].includes(plan.status) ? 'success' : 'warning'}>{plan.status}</Badge></div><div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3 text-[10px]"><div><span className="text-muted">Started</span><b className="mt-1 block">{date(plan.startDate)}</b></div><div><span className="text-muted">End date</span><b className="mt-1 block">{date(plan.endDate)}</b></div></div><Link to="/student/subscription" className="mt-4 inline-flex text-[10px] font-bold text-brand-700">Manage subscription →</Link></> : <div className="mt-4 rounded-lg bg-slate-50 p-4 text-xs text-muted">No subscription is assigned to your account.</div>}
      </section>
    </div>
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-line bg-white p-4 shadow-soft"><div className="flex items-center justify-between"><div><h2 className="text-xs font-bold">Learning activity</h2><p className="mt-1 text-[10px] text-muted">Recent course visits</p></div><Activity size={16} className="text-brand-600" /></div><div className="mt-5 flex h-28 items-end gap-2">{(activity.length ? activity.slice(-14) : Array.from({ length: 10 }, (_, index) => ({ date: '', count: 0, key: index }))).map((point, index) => <div key={point.date || point.key || index} className="flex h-full flex-1 flex-col items-center justify-end gap-1"><div className="w-full max-w-7 rounded-t bg-brand-400" style={{ height: `${Math.max(4, (point.count / peak) * 90)}%` }} /><span className="text-[8px] text-muted">{point.date ? new Date(`${point.date}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric' }) : '—'}</span></div>)}</div><p className="mt-2 text-right text-[9px] text-muted">{summary.hoursLearned ?? 0} hours learned</p></div>
      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-soft"><div className="flex items-center justify-between border-b border-line px-4 py-3"><h2 className="text-xs font-bold">Recent invoices</h2><Link to="/student/invoices" className="text-[10px] font-bold text-brand-700">View all</Link></div>{dashboard?.recentInvoices?.length ? <div className="divide-y divide-slate-100">{dashboard.recentInvoices.map((invoice) => <Link key={invoice.id} to={`/student/invoices?search=${encodeURIComponent(invoice.invoiceNumber)}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50"><span className="min-w-0 flex-1"><b className="block truncate text-[11px]">{invoice.invoiceNumber}</b><small className="text-[9px] text-muted">{invoice.paymentName} · due {date(invoice.dueDate)}</small></span><b className="text-[11px]">{money(invoice.amount)}</b><Badge tone={invoice.paymentStatus === 'PAID' ? 'success' : 'warning'}>{invoice.paymentStatus}</Badge></Link>)}</div> : <div className="p-7 text-center text-xs text-muted">No invoices yet.</div>}</div>
    </section>
  </div>;
}
