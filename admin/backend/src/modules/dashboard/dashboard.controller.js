import { z } from 'zod';
import AdminAccount from '../../models/AdminAccount.js';
import BusinessOwner from '../../models/BusinessOwner.js';
import Organization from '../../models/Organization.js';
import { apiResponse } from '../../utils/apiResponse.js';
import { env } from '../../config/env.js';

function dateRange(query) {
  if (Boolean(query.fromDate) !== Boolean(query.toDate)) throw Object.assign(new Error('fromDate and toDate must be provided together'), { status: 400 });
  if (!query.fromDate) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(query.fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(query.toDate)) throw Object.assign(new Error('Dates must use YYYY-MM-DD'), { status: 400 });
  const from = new Date(`${query.fromDate}T00:00:00.000Z`), to = new Date(`${query.toDate}T23:59:59.999Z`);
  if (Number.isNaN(+from) || Number.isNaN(+to) || from > to) throw Object.assign(new Error('Invalid date range'), { status: 400 });
  return { from, to };
}

function activityPipeline(page, size, range) {
  const concatName = (parts) => ({ $concat: parts.map((p) => ({ $ifNull: [p, ''] })).flatMap((p, i) => i ? [' ', p] : [p]) });
  const owner = [{ $project: { entityType: { $literal: 'BUSINESS_OWNER' }, entityId: { $toString: '$_id' }, displayName: concatName(['$firstName', '$lastName']), createdAt: 1, updatedAt: 1 } }];
  const organization = [{ $project: { entityType: { $literal: 'ORGANIZATION' }, entityId: { $toString: '$_id' }, displayName: '$name', createdAt: 1, updatedAt: 1 } }];
  const admin = [{ $project: { entityType: { $literal: 'ADMIN_ACCOUNT' }, entityId: { $toString: '$_id' }, displayName: '$email', createdAt: 1, updatedAt: 1 } }];
  return [ ...owner, { $unionWith: { coll: Organization.collection.name, pipeline: organization } }, { $unionWith: { coll: AdminAccount.collection.name, pipeline: admin } },
    { $set: { activityType: { $cond: [{ $gt: ['$updatedAt', '$createdAt'] }, 'UPDATED', 'CREATED'] }, occurredAt: { $cond: [{ $gt: ['$updatedAt', '$createdAt'] }, '$updatedAt', '$createdAt'] } } },
    ...(range ? [{ $match: { occurredAt: { $gte: range.from, $lte: range.to } } }] : []),
    { $facet: { items: [{ $sort: { occurredAt: -1, entityId: 1 } }, { $skip: page * size }, { $limit: size }], total: [{ $count: 'count' }] } },
  ];
}

const metricNames = ['businessOwnerRegistrations', 'organizationRegistrations', 'adminAccountRegistrations', 'businessOwnerUpdates', 'organizationUpdates', 'adminAccountUpdates'];

export const dashboardController = {
  async dashboard(req, res, next) {
    try {
      const range = dateRange(req.query), page = Number(req.query.page ?? 0), size = Number(req.query.size ?? 20);
      if (!Number.isInteger(page) || page < 0 || !Number.isInteger(size) || size < 1 || size > 100) throw Object.assign(new Error('Invalid page or size'), { status: 400 });
      const [ownerTotal, orgTotal, adminTotal, ownersActive, orgsActive, adminsEnabled, ownersInRange, orgsInRange, activity] = await Promise.all([
        BusinessOwner.countDocuments(), Organization.countDocuments(), AdminAccount.countDocuments(), BusinessOwner.countDocuments({ status: 'ACTIVE' }), Organization.countDocuments({ status: 'ACTIVE' }), AdminAccount.countDocuments({ enabled: true }),
        range ? BusinessOwner.countDocuments({ createdAt: { $gte: range.from, $lte: range.to } }) : BusinessOwner.countDocuments(),
        range ? Organization.countDocuments({ createdAt: { $gte: range.from, $lte: range.to } }) : Organization.countDocuments(),
        BusinessOwner.aggregate(activityPipeline(page, size, range)),
      ]);
      const result = activity[0] || { items: [], total: [] }, count = result.total[0]?.count || 0;
      return apiResponse(res, { data: { fromDate: req.query.fromDate || null, toDate: req.query.toDate || null, timezone: env.timezone,
        platformSummary: { businessOwnerCount: ownerTotal, organizationCount: orgTotal, adminAccountCount: adminTotal },
        businessOwners: { total: ownerTotal, active: ownersActive, inactive: ownerTotal - ownersActive, registeredInRange: ownersInRange },
        organizations: { total: orgTotal, active: orgsActive, inactive: orgTotal - orgsActive, createdInRange: orgsInRange },
        adminAccounts: { total: adminTotal, enabled: adminsEnabled, disabled: adminTotal - adminsEnabled },
        recentActivity: result.items, recentActivityTotal: count, recentActivityPage: page, recentActivitySize: size,
      } });
    } catch (error) { next(error); }
  },
  async analytics(req, res, next) {
    try {
      const range = dateRange(req.query); if (!range) throw Object.assign(new Error('fromDate and toDate are required'), { status: 400 });
      const groupBy = z.enum(['DAY', 'WEEK', 'MONTH']).default('DAY').parse(req.query.groupBy);
      const format = groupBy === 'MONTH' ? '%Y-%m' : groupBy === 'WEEK' ? '%G-W%V' : '%Y-%m-%d';
      const models = [BusinessOwner, Organization, AdminAccount], prefixes = ['businessOwner', 'organization', 'adminAccount'];
      const summary = Object.fromEntries(metricNames.map((key) => [key, 0])), buckets = new Map();
      for (let i = 0; i < models.length; i += 1) {
        for (const event of ['Registrations', 'Updates']) {
          const timeField = event === 'Registrations' ? 'createdAt' : 'updatedAt';
          const match = event === 'Registrations'
            ? { [timeField]: { $gte: range.from, $lte: range.to } }
            : { $expr: { $and: [{ $gt: ['$updatedAt', '$createdAt'] }, { $gte: ['$updatedAt', range.from] }, { $lte: ['$updatedAt', range.to] }] } };
          const rows = await models[i].aggregate([{ $match: match }, { $group: { _id: { $dateToString: { format, date: `$${timeField}`, timezone: env.timezone } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]);
          const metric = `${prefixes[i]}${event}`; for (const row of rows) {
            summary[metric] += row.count;
            const bucket = buckets.get(row._id) || { period: row._id, ...Object.fromEntries(metricNames.map((key) => [key, 0])) };
            bucket[metric] += row.count; buckets.set(row._id, bucket);
          }
        }
      }
      return apiResponse(res, { data: { fromDate: req.query.fromDate, toDate: req.query.toDate, groupBy, timezone: env.timezone, summary, periods: [...buckets.values()].sort((a, b) => a.period.localeCompare(b.period)) } });
    } catch (error) { next(error); }
  },
};
