import { z } from 'zod';
import Billing from '../../models/Billing.js';
import Subscriber from '../../models/Subscriber.js';
import BillingNotification from '../../models/BillingNotification.js';
import { apiResponse } from '../../utils/apiResponse.js';
import { pageSpec, regex, setPageHeaders } from '../../utils/query.js';
import { tenantFilter } from '../shared/ownerRepository.js';
import { billingRepository } from './billing.repository.js';
import { billingService } from './billing.service.js';

const idSchema = z.string().regex(/^[a-f\d]{24}$/i);
const createSchema = z.object({ subscriberId: idSchema.optional(), subscriptionId: idSchema.optional(), courseId: idSchema.optional(), paymentName: z.string().trim().min(1).max(200), amount: z.number().finite().min(0).optional(), dueDate: z.coerce.date(), discountCode: z.string().trim().max(50).optional(), paymentMethod: z.string().max(80).optional() });
const csvCell = (value) => `"${String(value ?? '').replace(/[\r\n\t]/g, ' ').replace(/"/g, '""').replace(/^[\s\u0000-\u001f]*[=+@-]/, (match) => `'${match}`)}"`;
function queryFilter(req) {
  const filter = {};
  if (req.query.paymentStatus) {
    if (!['PAID', 'UNPAID', 'OVERDUE'].includes(req.query.paymentStatus)) throw Object.assign(new Error('Invalid payment status'), { status: 400 });
    filter.paymentStatus = req.query.paymentStatus;
  }
  if (req.query.subscriberId) { if (!idSchema.safeParse(req.query.subscriberId).success) throw Object.assign(new Error('Invalid subscriber id'), { status: 400 }); filter.subscriberId = req.query.subscriberId; }
  if (req.query.search) { if (String(req.query.search).length > 200) throw Object.assign(new Error('Search must be at most 200 characters'), { status: 400 }); const term = regex(String(req.query.search)); filter.$or = [{ invoiceNumber: term }, { paymentName: term }]; }
  if (Boolean(req.query.fromDate) !== Boolean(req.query.toDate)) throw Object.assign(new Error('fromDate and toDate must be provided together'), { status: 400 });
  if (req.query.fromDate) { const from = new Date(`${req.query.fromDate}T00:00:00Z`), to = new Date(`${req.query.toDate}T23:59:59.999Z`); if (Number.isNaN(+from) || Number.isNaN(+to) || from > to) throw Object.assign(new Error('Invalid date range'), { status: 400 }); filter.dueDate = { $gte: from, $lte: to }; }
  return filter;
}
const view = (row) => ({ id: String(row._id), organizationId: String(row.organizationId), subscriberId: row.subscriberId ? String(row.subscriberId._id || row.subscriberId) : null, subscriberName: row.subscriberId?.fullName || '', subscriberEmail: row.subscriberId?.email || '', subscriptionId: row.subscriptionId ? String(row.subscriptionId._id || row.subscriptionId) : null, planName: row.subscriptionId?.planName || '', courseId: row.courseId ? String(row.courseId) : null, invoiceNumber: row.invoiceNumber, paymentName: row.paymentName, dueDate: row.dueDate, paidDate: row.paidDate, amount: row.amount, originalAmount: row.originalAmount, discountAmount: row.discountAmount, paymentStatus: row.paymentStatus, paymentMethod: row.paymentMethod, createdAt: row.createdAt });

export const billingController = {
  async list(req, res, next) {
    try {
      const page = pageSpec(req.query, ['id', 'invoiceNumber', 'paymentName', 'amount', 'paymentStatus', 'dueDate', 'createdAt'], { sortBy: 'createdAt', sortDirection: 'DESC' });
      const filter = tenantFilter(req, queryFilter(req));
      const orgIds = req.ownerOrganizationIds || [];
      const [rows, total] = await Promise.all([Billing.find(filter).populate({ path: 'subscriberId', select: 'fullName email', match: { organizationId: { $in: orgIds } } }).populate({ path: 'subscriptionId', select: 'planName', match: { organizationId: { $in: orgIds } } }).sort(page.sort).skip(page.skip).limit(page.size), Billing.countDocuments(filter)]);
      setPageHeaders(res, total, page.page, page.size);
      return apiResponse(res, { data: rows.map(view) });
    } catch (error) { next(error); }
  },
  async csv(req, res, next) {
    try {
      const filter = tenantFilter(req, queryFilter(req));
      const total = await Billing.countDocuments(filter);
      if (total > 10000) throw Object.assign(new Error('CSV export exceeds 10,000 rows'), { status: 413 });
      const orgIds = req.ownerOrganizationIds || [];
      const rows = await Billing.find(filter).populate({ path: 'subscriberId', select: 'fullName email', match: { organizationId: { $in: orgIds } } }).populate({ path: 'subscriptionId', select: 'planName', match: { organizationId: { $in: orgIds } } }).sort({ createdAt: -1, _id: 1 });
      const columns = ['invoiceNumber', 'subscriberName', 'subscriberEmail', 'planName', 'paymentName', 'originalAmount', 'discountAmount', 'amount', 'paymentStatus', 'paymentMethod', 'dueDate', 'paidDate'];
      res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="owner-invoices.csv"', 'Cache-Control': 'no-store' });
      return res.send([columns.map(csvCell).join(','), ...rows.map((row) => columns.map((key) => csvCell(key === 'subscriberName' ? row.subscriberId?.fullName : key === 'subscriberEmail' ? row.subscriberId?.email : key === 'planName' ? row.subscriptionId?.planName : row[key] instanceof Date ? row[key].toISOString() : row[key])).join(','))].join('\r\n'));
    } catch (error) { next(error); }
  },
  async create(req, res, next) { try { const invoice = await billingService.createInvoice(req, createSchema.parse(req.body)); return apiResponse(res, { status: 201, message: 'Invoice generated', data: view(invoice) }); } catch (error) { next(error); } },
  async get(req, res, next) { try { if (!idSchema.safeParse(req.params.id).success) throw Object.assign(new Error('Invalid id'), { status: 400 }); const invoice = await billingRepository.find(req, req.params.id); if (!invoice) throw Object.assign(new Error('Invoice not found'), { status: 404 }); return apiResponse(res, { data: view(invoice) }); } catch (error) { next(error); } },
  async paid(req, res, next) { try { if (!idSchema.safeParse(req.params.id).success) throw Object.assign(new Error('Invalid id'), { status: 400 }); const { paidDate } = z.object({ paidDate: z.coerce.date().optional() }).parse(req.body); const invoice = await billingService.markPaid(req, req.params.id, paidDate); return apiResponse(res, { data: view(invoice) }); } catch (error) { next(error); } },
  async notify(req, res, next) {
    try {
      if (!idSchema.safeParse(req.params.id).success) throw Object.assign(new Error('Invalid id'), { status: 400 });
      const { message } = z.object({ message: z.string().trim().min(1).max(5000) }).parse(req.body);
      const invoice = await billingRepository.find(req, req.params.id);
      if (!invoice) throw Object.assign(new Error('Invoice not found'), { status: 404 });
      if (invoice.paymentStatus === 'PAID') throw Object.assign(new Error('A reminder is not needed for a paid invoice'), { status: 400 });
      const subscriber = invoice.subscriberId?._id ? invoice.subscriberId : await Subscriber.findOne(tenantFilter(req, { _id: invoice.subscriberId }));
      if (!subscriber) throw Object.assign(new Error('Invoice has no subscriber email'), { status: 400 });
      const notice = await BillingNotification.create({ organizationId: invoice.organizationId, billingId: invoice._id, recipientEmail: subscriber.email, subject: `Payment reminder: ${invoice.invoiceNumber}`, message, status: 'QUEUED' });
      return apiResponse(res, { status: 201, message: 'Billing notification queued', data: { id: String(notice._id), status: notice.status, recipientEmail: notice.recipientEmail } });
    } catch (error) { next(error); }
  },
};
