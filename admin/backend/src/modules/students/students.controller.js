import { z } from 'zod';
import Subscriber from '../../models/Subscriber.js';
import '../../models/Subscription.js';
import Billing from '../../models/Billing.js';
import Payment from '../../models/Payment.js';
import { apiResponse } from '../../utils/apiResponse.js';
import { pageSpec, regex, setPageHeaders } from '../../utils/query.js';
import { invalidateStudentSessionsById } from './studentSessions.js';

const CAP = 10000;
const idSchema = z.string().regex(/^[a-f\d]{24}$/i);
const csvCell = (value) => `"${String(value ?? '').replace(/[\r\n\t]/g, ' ').replace(/"/g, '""').replace(/^[\s\u0000-\u001f]*[=+@-]/, (match) => `'${match}`)}"`;

function filterFrom(query) {
  const filter = {};
  if (query.organizationId) {
    if (!idSchema.safeParse(query.organizationId).success) throw Object.assign(new Error('Invalid organization id'), { status: 400 });
    filter.organizationId = query.organizationId;
  }
  if (query.status) {
    if (!['PENDING', 'ACTIVE', 'TRIALING', 'SUSPENDED', 'INACTIVE', 'BLOCKED'].includes(String(query.status))) throw Object.assign(new Error('Invalid student status'), { status: 400 });
    if (query.status === 'BLOCKED') filter.accessBlocked = true;
    else filter.status = query.status;
  }
  if (query.registrationStatus) {
    if (!['PENDING', 'APPROVED', 'REJECTED'].includes(String(query.registrationStatus))) throw Object.assign(new Error('Invalid registration status'), { status: 400 });
    filter.registrationStatus = query.registrationStatus;
  }
  if (query.search) {
    if (String(query.search).length > 200) throw Object.assign(new Error('Search must be at most 200 characters'), { status: 400 });
    const term = regex(String(query.search));
    filter.$or = [{ fullName: term }, { email: term }, { phone: term }];
  }
  return filter;
}

async function paymentFilterFrom(query) {
  const filter = { paymentStatus: 'PAID', subscriberId: { $ne: null } };
  if (query.organizationId) {
    if (!idSchema.safeParse(query.organizationId).success) throw Object.assign(new Error('Invalid organization id'), { status: 400 });
    filter.organizationId = query.organizationId;
  }
  if (Boolean(query.fromDate) !== Boolean(query.toDate)) throw Object.assign(new Error('fromDate and toDate must be provided together'), { status: 400 });
  if (query.fromDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(query.fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(query.toDate)) throw Object.assign(new Error('Dates must use YYYY-MM-DD'), { status: 400 });
    const from = new Date(`${query.fromDate}T00:00:00.000Z`), to = new Date(`${query.toDate}T23:59:59.999Z`);
    if (Number.isNaN(+from) || Number.isNaN(+to) || from > to) throw Object.assign(new Error('Invalid date range'), { status: 400 });
    filter.paidDate = { $gte: from, $lte: to };
  }
  if (query.search) {
    if (String(query.search).length > 200) throw Object.assign(new Error('Search must be at most 200 characters'), { status: 400 });
    const term = regex(String(query.search));
    const students = await Subscriber.find({ $or: [{ fullName: term }, { email: term }] }).select('_id').lean();
    filter.$or = [{ invoiceNumber: term }, { paymentName: term }, { subscriberId: { $in: students.map((student) => student._id) } }];
  }
  return filter;
}

async function rowsFor(filter, sort = { fullName: 1, _id: 1 }, skip = 0, limit = CAP, enforceCap = false) {
  const [students, total] = await Promise.all([
    Subscriber.find(filter).populate({ path: 'organizationId', select: 'name status ownerId' }).populate({ path: 'subscriptionId', select: 'planName' }).sort(sort).skip(skip).limit(limit),
    Subscriber.countDocuments(filter),
  ]);
  if (enforceCap && total > CAP) throw Object.assign(new Error('Student export exceeds 10,000 rows'), { status: 413 });
  const ids = students.map((student) => student._id);
  const financials = ids.length ? await Billing.aggregate([
    { $match: { subscriberId: { $in: ids } } },
    { $group: {
      _id: '$subscriberId',
      paidInvoiceCount: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'PAID'] }, 1, 0] } },
      totalPaid: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'PAID'] }, '$amount', 0] } },
      pendingAmount: { $sum: { $cond: [{ $ne: ['$paymentStatus', 'PAID'] }, '$amount', 0] } },
    } },
  ]) : [];
  const totals = new Map(financials.map((item) => [String(item._id), item]));
  return {
    total,
    rows: students.map((student) => {
      const amounts = totals.get(String(student._id)) || {};
      return {
        id: String(student._id),
        organizationId: student.organizationId ? String(student.organizationId._id) : '',
        organizationName: student.organizationId?.name || '',
        organizationStatus: student.organizationId?.status || '',
        fullName: student.fullName,
        email: student.email,
        phone: student.phone || '',
        status: student.accessBlocked ? 'BLOCKED' : student.status,
        accessBlocked: Boolean(student.accessBlocked),
        accessBlockedReason: student.accessBlockedReason || '',
        registrationStatus: student.registrationStatus,
        planName: student.subscriptionId?.planName || '',
        paidInvoiceCount: amounts.paidInvoiceCount || 0,
        totalPaid: Math.round((amounts.totalPaid || 0) * 100) / 100,
        pendingAmount: Math.round((amounts.pendingAmount || 0) * 100) / 100,
        createdAt: student.createdAt,
      };
    }),
  };
}

function sendCsv(res, rows) {
  const columns = ['id', 'organizationId', 'organizationName', 'fullName', 'email', 'phone', 'status', 'registrationStatus', 'planName', 'paidInvoiceCount', 'totalPaid', 'pendingAmount', 'createdAt'];
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="admin-students.csv"', 'Cache-Control': 'no-store' });
  return res.send([columns.map(csvCell).join(','), ...rows.map((row) => columns.map((key) => csvCell(row[key] instanceof Date ? row[key].toISOString() : row[key])).join(','))].join('\r\n'));
}

export const studentsController = {
  async list(req, res, next) {
    try {
      const page = pageSpec(req.query, ['id', 'fullName', 'email', 'status', 'createdAt'], { sortBy: 'createdAt', sortDirection: 'DESC' });
      const filter = filterFrom(req.query);
      const { rows, total } = await rowsFor(filter, page.sort, page.skip, page.size);
      setPageHeaders(res, total, page.page, page.size);
      return apiResponse(res, { data: rows });
    } catch (error) { return next(error); }
  },
  async csv(req, res, next) {
    try {
      const filter = filterFrom(req.query);
      const { rows } = await rowsFor(filter, { fullName: 1, _id: 1 }, 0, CAP, true);
      return sendCsv(res, rows);
    } catch (error) { return next(error); }
  },
  async payments(req, res, next) {
    try {
      const { page, size, skip, sort } = pageSpec(req.query, ['id', 'paidDate', 'amount', 'invoiceNumber'], { sortBy: 'paidDate', sortDirection: 'DESC' });
      const filter = await paymentFilterFrom(req.query);
      const [invoices, total] = await Promise.all([Billing.find(filter).populate({ path: 'subscriberId', select: 'fullName email' }).populate({ path: 'organizationId', select: 'name' }).sort(sort).skip(skip).limit(size), Billing.countDocuments(filter)]);
      const payments = invoices.length ? await Payment.find({ billingId: { $in: invoices.map((invoice) => invoice._id) } }).select('billingId providerReference provider paymentMethodType') : [];
      const paymentByInvoice = new Map(payments.map((payment) => [String(payment.billingId), payment]));
      setPageHeaders(res, total, page, size);
      return apiResponse(res, { data: invoices.map((invoice) => {
        const payment = paymentByInvoice.get(String(invoice._id));
        return {
          id: String(invoice._id), invoiceNumber: invoice.invoiceNumber, paymentName: invoice.paymentName,
          organizationId: String(invoice.organizationId?._id || invoice.organizationId), organizationName: invoice.organizationId?.name || '',
          subscriberId: String(invoice.subscriberId?._id || invoice.subscriberId), studentName: invoice.subscriberId?.fullName || '',
          studentEmail: invoice.subscriberId?.email || '', amount: invoice.amount, paymentStatus: invoice.paymentStatus,
          paymentMethod: invoice.paymentMethod, providerReference: payment?.providerReference || '',
          provider: payment?.provider || '', paidDate: invoice.paidDate,
        };
      }) });
    } catch (error) { return next(error); }
  },
  async paymentsCsv(req, res, next) {
    try {
      const filter = await paymentFilterFrom(req.query);
      const total = await Billing.countDocuments(filter);
      if (total > CAP) throw Object.assign(new Error('Payment export exceeds 10,000 rows'), { status: 413 });
      const invoices = await Billing.find(filter).populate({ path: 'subscriberId', select: 'fullName email' }).populate({ path: 'organizationId', select: 'name' }).sort({ paidDate: -1, _id: 1 });
      const paymentRows = invoices.length ? await Payment.find({ billingId: { $in: invoices.map((invoice) => invoice._id) } }).select('billingId providerReference provider') : [];
      const paymentByInvoice = new Map(paymentRows.map((payment) => [String(payment.billingId), payment]));
      const rows = invoices.map((invoice) => {
        const payment = paymentByInvoice.get(String(invoice._id));
        return {
          invoiceNumber: invoice.invoiceNumber, organizationName: invoice.organizationId?.name || '',
          studentName: invoice.subscriberId?.fullName || '', studentEmail: invoice.subscriberId?.email || '',
          amount: invoice.amount, paymentStatus: invoice.paymentStatus, paymentMethod: invoice.paymentMethod,
          providerReference: payment?.providerReference || '', provider: payment?.provider || '', paidDate: invoice.paidDate,
        };
      });
      const columns = ['invoiceNumber', 'organizationName', 'studentName', 'studentEmail', 'amount', 'paymentStatus', 'paymentMethod', 'providerReference', 'provider', 'paidDate'];
      res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="admin-student-payments.csv"', 'Cache-Control': 'no-store' });
      return res.send([columns.map(csvCell).join(','), ...rows.map((row) => columns.map((key) => csvCell(row[key] instanceof Date ? row[key].toISOString() : row[key])).join(','))].join('\r\n'));
    } catch (error) { return next(error); }
  },
  async block(req, res, next) {
    try {
      if (!idSchema.safeParse(req.params.id).success) throw Object.assign(new Error('Invalid student id'), { status: 400 });
      const { reason } = z.object({ reason: z.string().trim().max(500).optional().default('') }).parse(req.body || {});
      const student = await Subscriber.findById(req.params.id);
      if (!student) throw Object.assign(new Error('Student not found'), { status: 404 });
      student.accessBlocked = true;
      student.accessBlockedReason = reason;
      student.accessBlockedAt = new Date();
      await student.save();
      await invalidateStudentSessionsById(student._id);
      return apiResponse(res, { message: 'Student access blocked', data: { id: String(student._id), accessBlocked: true } });
    } catch (error) { return next(error); }
  },
  async unblock(req, res, next) {
    try {
      if (!idSchema.safeParse(req.params.id).success) throw Object.assign(new Error('Invalid student id'), { status: 400 });
      const student = await Subscriber.findById(req.params.id);
      if (!student) throw Object.assign(new Error('Student not found'), { status: 404 });
      student.accessBlocked = false;
      student.accessBlockedReason = '';
      student.accessBlockedAt = null;
      await student.save();
      return apiResponse(res, { message: 'Student access restored', data: { id: String(student._id), accessBlocked: false } });
    } catch (error) { return next(error); }
  },
};
