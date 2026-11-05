import { z } from 'zod';
import BillingNotification from '../../models/BillingNotification.js';
import { apiResponse } from '../../utils/apiResponse.js';
import { pageSpec, regex, setPageHeaders } from '../../utils/query.js';
import { tenantFilter } from '../shared/ownerRepository.js';
import { notificationsService } from './notifications.service.js';

const id = z.string().regex(/^[a-f\d]{24}$/i);
const dispatchSchema = z.object({ notificationType: z.enum(['ANNOUNCEMENT', 'SYSTEM_ALERT']), audience: z.enum(['ALL_ACTIVE', 'ALL_USERS', 'PLAN']), subscriptionId: id.optional(), subject: z.string().trim().min(1).max(200), message: z.string().trim().min(1).max(5000) });
const csvCell = (value) => `"${String(value ?? '').replace(/[\r\n\t]/g, ' ').replace(/"/g, '""').replace(/^[\s\u0000-\u001f]*[=+@-]/, (match) => `'${match}`)}"`;
const view = (row) => ({ id: String(row._id), notificationType: row.notificationType, recipientGroup: row.recipientGroup, recipientEmail: row.recipientEmail, recipientName: row.recipientName || '', subject: row.subject, message: row.message, status: row.status, sentAt: row.sentAt, createdAt: row.createdAt });

function filterFrom(req) {
  const filter = {};
  if (req.query.status) { if (!['QUEUED', 'SENT', 'FAILED'].includes(req.query.status)) throw Object.assign(new Error('Invalid status'), { status: 400 }); filter.status = req.query.status; }
  if (req.query.notificationType) { if (!['BILLING', 'ANNOUNCEMENT', 'SYSTEM_ALERT'].includes(req.query.notificationType)) throw Object.assign(new Error('Invalid notification type'), { status: 400 }); filter.notificationType = req.query.notificationType; }
  if (req.query.search) { if (String(req.query.search).length > 200) throw Object.assign(new Error('Search must be at most 200 characters'), { status: 400 }); const term = regex(String(req.query.search)); filter.$or = [{ recipientEmail: term }, { subject: term }, { message: term }]; }
  return filter;
}

export const notificationsController = {
  async list(req, res, next) {
    try {
      const page = pageSpec(req.query, ['id', 'subject', 'notificationType', 'status', 'createdAt'], { sortBy: 'createdAt', sortDirection: 'DESC' });
      const filter = tenantFilter(req, filterFrom(req));
      const [rows, total] = await Promise.all([BillingNotification.find(filter).sort(page.sort).skip(page.skip).limit(page.size), BillingNotification.countDocuments(filter)]);
      setPageHeaders(res, total, page.page, page.size);
      return apiResponse(res, { data: rows.map(view) });
    } catch (error) { next(error); }
  },
  async csv(req, res, next) {
    try {
      const filter = tenantFilter(req, filterFrom(req));
      const count = await BillingNotification.countDocuments(filter);
      if (count > 10000) throw Object.assign(new Error('CSV export exceeds 10,000 rows'), { status: 413 });
      const rows = await BillingNotification.find(filter).sort({ createdAt: -1, _id: 1 });
      const columns = ['notificationType', 'recipientGroup', 'recipientEmail', 'subject', 'message', 'status', 'sentAt', 'createdAt'];
      res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="owner-notification-history.csv"', 'Cache-Control': 'no-store' });
      return res.send([columns.map(csvCell).join(','), ...rows.map((row) => columns.map((key) => csvCell(row[key] instanceof Date ? row[key].toISOString() : row[key])).join(','))].join('\r\n'));
    } catch (error) { next(error); }
  },
  async dispatch(req, res, next) { try { const result = await notificationsService.dispatch(req, dispatchSchema.parse(req.body)); return apiResponse(res, { status: 201, message: `Queued ${result.queued} notifications`, data: result }); } catch (error) { next(error); } },
};
