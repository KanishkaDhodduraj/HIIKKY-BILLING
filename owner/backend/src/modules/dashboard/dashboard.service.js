import { dashboardRepository } from './dashboard.repository.js';

export function rangeFromQuery(query) {
  if (Boolean(query.fromDate) !== Boolean(query.toDate)) throw Object.assign(new Error('fromDate and toDate must be provided together'), { status: 400 });
  if (query.fromDate && (!/^\d{4}-\d{2}-\d{2}$/.test(query.fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(query.toDate))) throw Object.assign(new Error('Dates must use YYYY-MM-DD'), { status: 400 });
  const to = query.toDate ? new Date(`${query.toDate}T23:59:59.999Z`) : new Date();
  const from = query.fromDate ? new Date(`${query.fromDate}T00:00:00.000Z`) : new Date(to.getTime() - 29 * 86400000);
  if (Number.isNaN(+from) || Number.isNaN(+to) || from > to) throw Object.assign(new Error('Invalid date range'), { status: 400 });
  return { from, to };
}

const monthlyRange = (now = new Date()) => { const to = new Date(now); to.setMonth(to.getMonth() + 1, 0); to.setHours(23, 59, 59, 999); const from = new Date(now.getFullYear(), now.getMonth() - 11, 1); from.setHours(0, 0, 0, 0); return { from, to }; };
const money = (amount) => Math.round((Number(amount) || 0) * 100) / 100;

export const dashboardService = {
  async dashboard(req, query = {}) {
    const { from, to } = rangeFromQuery(query);
    const monthRange = monthlyRange(to);
    const [summary, revenueTrend, plans, topPayers, renewals, recentPayments, transactionVolume] = await Promise.all([
      dashboardRepository.counts(req), dashboardRepository.revenueByMonth(req, monthRange.from, monthRange.to), dashboardRepository.planDistribution(req),
      dashboardRepository.topPayers(req), dashboardRepository.upcomingRenewals(req, new Date(), new Date(Date.now() + 30 * 86400000)),
      dashboardRepository.recentPayments(req, 8), dashboardRepository.transactionVolume(req, from, to),
    ]);
    const mrr = plans.reduce((sum, plan) => sum + ((plan.billingCycle === 'YEARLY' ? plan.price / 12 : plan.billingCycle === 'MONTHLY' ? plan.price : 0) * plan.subscribers), 0);
    const value = summary.paid.amount || 0;
    return {
      period: { fromDate: from.toISOString().slice(0, 10), toDate: to.toISOString().slice(0, 10) },
      source: 'Organization billing records',
      summary: { totalRevenue: money(value), monthlyRecurringRevenue: money(mrr), activeSubscribers: summary.activeSubscribers, totalSubscribers: summary.subscribers, activeSubscriptions: summary.activeSubscriptions, totalCourses: summary.courses, paidInvoices: summary.paid.count, unpaidAmount: money(summary.unpaid.amount), overdueAmount: money(summary.overdue.amount), churnRate: null },
      revenueTrend: revenueTrend.map((row) => ({ month: row._id, revenue: money(row.revenue), transactions: row.transactions })),
      subscriberPlans: plans,
      topPayers,
      renewals: renewals.map((row) => ({ id: String(row._id), fullName: row.fullName, email: row.email, renewalDate: row.endDate })),
      recentPayments: recentPayments.map((row) => ({ id: String(row._id), invoiceNumber: row.invoiceNumber, paymentName: row.paymentName, subscriberName: row.subscriberId?.fullName || '—', amount: row.amount, paymentStatus: row.paymentStatus, createdAt: row.createdAt })),
      transactionVolume,
    };
  },
  async revenue(req, query) {
    const dashboard = await this.dashboard(req, query);
    return { period: dashboard.period, summary: { totalRevenue: dashboard.summary.totalRevenue, paidInvoices: dashboard.summary.paidInvoices, unpaidAmount: dashboard.summary.unpaidAmount, overdueAmount: dashboard.summary.overdueAmount }, revenueTrend: dashboard.revenueTrend, topPayers: dashboard.topPayers, recentPayments: dashboard.recentPayments };
  },
  async subscriptions(req, query) {
    const dashboard = await this.dashboard(req, query);
    return { period: dashboard.period, summary: { activeSubscribers: dashboard.summary.activeSubscribers, totalSubscribers: dashboard.summary.totalSubscribers, activeSubscriptions: dashboard.summary.activeSubscriptions, churnRate: dashboard.summary.churnRate }, subscriberPlans: dashboard.subscriberPlans };
  },
};
