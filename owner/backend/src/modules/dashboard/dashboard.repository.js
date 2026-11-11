import mongoose from 'mongoose';
import Subscriber from '../../models/Subscriber.js';
import Subscription from '../../models/Subscription.js';
import Billing from '../../models/Billing.js';
import Course from '../../models/Course.js';
import { tenantFilter } from '../shared/ownerRepository.js';

const organizationIds = (req) => (req.ownerOrganizationIds || []).map((id) => new mongoose.Types.ObjectId(id));
export const dashboardRepository = {
  async counts(req) {
    const [subscribers, activeSubscribers, pendingStudentRegistrations, activeSubscriptions, courses, paid, unpaid, overdue] = await Promise.all([
      Subscriber.countDocuments(tenantFilter(req)), Subscriber.countDocuments(tenantFilter(req, { status: 'ACTIVE' })),
      Subscriber.countDocuments(tenantFilter(req, { registrationStatus: 'PENDING' })),
      Subscription.countDocuments(tenantFilter(req, { status: 'ACTIVE' })), Course.countDocuments(tenantFilter(req)),
      Billing.aggregate([{ $match: tenantFilter(req, { paymentStatus: 'PAID' }) }, { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } }]),
      Billing.aggregate([{ $match: tenantFilter(req, { paymentStatus: 'UNPAID' }) }, { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } }]),
      Billing.aggregate([{ $match: tenantFilter(req, { paymentStatus: 'OVERDUE' }) }, { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    ]);
    return { subscribers, activeSubscribers, pendingStudentRegistrations, activeSubscriptions, courses, paid: paid[0] || { amount: 0, count: 0 }, unpaid: unpaid[0] || { amount: 0, count: 0 }, overdue: overdue[0] || { amount: 0, count: 0 } };
  },
  revenueByMonth(req, from, to) {
    return Billing.aggregate([{ $match: tenantFilter(req, { paymentStatus: 'PAID', paidDate: { $gte: from, $lte: to } }) }, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$paidDate' } }, revenue: { $sum: '$amount' }, transactions: { $sum: 1 } } }, { $sort: { _id: 1 } }]);
  },
  planDistribution(req) {
    return Subscriber.aggregate([
      { $match: tenantFilter(req, { status: 'ACTIVE', subscriptionId: { $ne: null } }) },
      { $group: { _id: '$subscriptionId', subscribers: { $sum: 1 } } },
      { $lookup: { from: 'subscriptions', localField: '_id', foreignField: '_id', as: 'plan' } },
      { $unwind: '$plan' }, { $match: { 'plan.organizationId': { $in: organizationIds(req) } } },
      { $project: { _id: 0, planName: '$plan.planName', price: '$plan.price', billingCycle: '$plan.billingCycle', subscribers: 1 } },
      { $sort: { subscribers: -1 } },
    ]);
  },
  topPayers(req) {
    return Billing.aggregate([
      { $match: tenantFilter(req, { paymentStatus: 'PAID' }) },
      { $group: { _id: '$subscriberId', totalPaid: { $sum: '$amount' } } }, { $sort: { totalPaid: -1 } }, { $limit: 5 },
      { $lookup: { from: 'subscribers', localField: '_id', foreignField: '_id', as: 'subscriber' } }, { $unwind: '$subscriber' },
      { $match: { 'subscriber.organizationId': { $in: organizationIds(req) } } },
      { $project: { _id: 0, id: { $toString: '$subscriber._id' }, fullName: '$subscriber.fullName', email: '$subscriber.email', totalPaid: 1 } },
    ]);
  },
  upcomingRenewals(req, from, to) { return Subscriber.find(tenantFilter(req, { status: 'ACTIVE', endDate: { $gte: from, $lte: to } })).sort({ endDate: 1 }).limit(8).select('fullName email endDate subscriptionId'); },
  recentPayments(req, limit = 8) { const orgIds = req.ownerOrganizationIds || []; return Billing.find(tenantFilter(req)).populate({ path: 'subscriberId', select: 'fullName email', match: { organizationId: { $in: orgIds } } }).sort({ createdAt: -1, _id: 1 }).limit(limit); },
  transactionVolume(req, from, to) { return Billing.aggregate([{ $match: tenantFilter(req, { createdAt: { $gte: from, $lte: to } }) }, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]); },
};
