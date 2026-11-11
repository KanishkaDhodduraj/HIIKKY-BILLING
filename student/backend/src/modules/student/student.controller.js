import { z } from 'zod';
import Payment from '../../models/Payment.js';
import { apiResponse } from '../../utils/apiResponse.js';
import { pagination, setPageHeaders } from '../../utils/query.js';
import { studentScope } from './student.repository.js';
import { studentService } from './student.service.js';

const csvCell = (value) => `"${String(value ?? '').replace(/[\r\n\t]/g, ' ').replace(/"/g, '""').replace(/^[\s\u0000-\u001f]*[=+@-]/, (match) => `'${match}`)}"`;
const html = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const id = z.string().regex(/^[a-f\d]{24}$/i);

function csv(res, rows, columns, filename) {
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'no-store' });
  return res.send([columns.map(csvCell).join(','), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(','))].join('\r\n'));
}

export const studentController = {
  async dashboard(req, res, next) {
    try { return apiResponse(res, { data: await studentService.dashboard(req) }); } catch (error) { return next(error); }
  },
  async courses(req, res, next) {
    try {
      const { page, size } = pagination({ ...req.query, sortBy: req.query.sortBy === 'courseName' ? 'courseName' : 'createdAt' }, ['courseName', 'createdAt'], { sortBy: 'createdAt', sortDirection: 'DESC' });
      const result = await studentService.courses(req, { category: req.query.category, search: req.query.search, sortBy: req.query.sortBy === 'courseName' ? 'name' : 'recent', page, size });
      setPageHeaders(res, result.total, page, size);
      return apiResponse(res, { data: result.rows });
    } catch (error) { return next(error); }
  },
  async course(req, res, next) {
    try { return apiResponse(res, { data: await studentService.courseDetail(req, req.params.courseId) }); } catch (error) { return next(error); }
  },
  async openCourse(req, res, next) {
    try { return apiResponse(res, { data: await studentService.openCourse(req, req.params.courseId) }); } catch (error) { return next(error); }
  },
  async courseProgress(req, res, next) {
    try {
      const { progressPercent } = z.object({ progressPercent: z.number().min(0).max(100) }).parse(req.body);
      return apiResponse(res, { data: await studentService.updateCourseProgress(req, req.params.courseId, progressPercent) });
    } catch (error) { return next(error); }
  },
  async installments(req, res, next) {
    try {
      const course = await studentService.courseDetail(req, req.params.courseId);
      return apiResponse(res, { data: course.installments });
    } catch (error) { return next(error); }
  },
  async plans(req, res, next) {
    try { return apiResponse(res, { data: await studentService.plans(req) }); } catch (error) { return next(error); }
  },
  async changePlan(req, res, next) {
    try {
      const { subscriptionId, discountCode } = z.object({ subscriptionId: id, discountCode: z.string().trim().max(50).optional() }).parse(req.body);
      return apiResponse(res, { status: 201, message: 'Plan invoice created', data: await studentService.changePlan(req, subscriptionId, discountCode) });
    } catch (error) { return next(error); }
  },
  async renew(req, res, next) {
    try {
      const { discountCode } = z.object({ discountCode: z.string().trim().max(50).optional() }).parse(req.body || {});
      return apiResponse(res, { status: 201, message: 'Renewal invoice created', data: await studentService.renew(req, discountCode) });
    } catch (error) { return next(error); }
  },
  async cancelPlan(req, res, next) {
    try { return apiResponse(res, { message: 'Subscription cancelled', data: await studentService.cancelPlan(req) }); } catch (error) { return next(error); }
  },
  async invoices(req, res, next) {
    try {
      const page = z.coerce.number().int().min(0).default(0).parse(req.query.page);
      const size = z.coerce.number().int().min(1).max(100).default(20).parse(req.query.size);
      const result = await studentService.invoices(req, { status: req.query.status, search: req.query.search, fromDate: req.query.fromDate, toDate: req.query.toDate, page, size });
      setPageHeaders(res, result.total, page, size);
      return apiResponse(res, { data: result.rows });
    } catch (error) { return next(error); }
  },
  async invoice(req, res, next) {
    try { return apiResponse(res, { data: await studentService.invoice(req, req.params.id) }); } catch (error) { return next(error); }
  },
  async invoicePrint(req, res, next) {
    try {
      const invoice = await studentService.invoice(req, req.params.id);
      res.set({ 'Content-Type': 'text/html; charset=utf-8', 'Content-Disposition': `inline; filename="${invoice.invoiceNumber}.html"`, 'Cache-Control': 'no-store' });
      return res.send(`<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${html(invoice.invoiceNumber)}</title><style>body{font:16px Arial,sans-serif;max-width:760px;margin:48px auto;color:#17223b}header{border-bottom:2px solid #4e2bdc;padding-bottom:16px}table{width:100%;margin-top:32px;border-collapse:collapse}td{padding:12px;border-bottom:1px solid #ddd}.total{font-weight:bold;text-align:right}@media print{button{display:none}}</style></head><body><header><h1>HIIKKY Invoice</h1><p>${html(req.organization.name)}</p></header><h2>${html(invoice.invoiceNumber)}</h2><p>${html(invoice.paymentName)}</p><table><tr><td>Invoice date</td><td>${html(new Date(invoice.createdAt).toLocaleDateString())}</td></tr><tr><td>Due date</td><td>${html(new Date(invoice.dueDate).toLocaleDateString())}</td></tr><tr><td>Status</td><td>${html(invoice.paymentStatus)}</td></tr><tr class="total"><td>Total</td><td>${html(invoice.amount.toFixed(2))} USD</td></tr></table><button onclick="window.print()">Print / Save as PDF</button></body></html>`);
    } catch (error) { return next(error); }
  },
  async invoiceCsv(req, res, next) {
    try {
      const result = await studentService.invoices(req, { status: req.query.status, search: req.query.search, fromDate: req.query.fromDate, toDate: req.query.toDate, page: 0, size: 10000 });
      if (result.total > 10000) throw Object.assign(new Error('CSV export exceeds 10,000 rows'), { status: 413 });
      return csv(res, result.rows.map((row) => ({ ...row, dueDate: row.dueDate?.toISOString(), paidDate: row.paidDate?.toISOString() })), ['invoiceNumber', 'paymentName', 'dueDate', 'paidDate', 'amount', 'paymentStatus'], 'student-invoices.csv');
    } catch (error) { return next(error); }
  },
  async pay(req, res, next) {
    try {
      const { paymentMethodId } = z.object({ paymentMethodId: id.optional() }).parse(req.body || {});
      const key = req.get('Idempotency-Key') || req.body?.idempotencyKey;
      return apiResponse(res, { message: 'Payment processed in sandbox', data: await studentService.pay(req, req.params.id, key, paymentMethodId) });
    } catch (error) { return next(error); }
  },
  async payments(req, res, next) {
    try {
      const { page, size, skip } = pagination(req.query, ['paidAt', 'amount'], { sortBy: 'paidAt', sortDirection: 'DESC' });
      const query = Payment.find(studentScope(req)).sort({ paidAt: -1, _id: 1 });
      const [rows, total] = await Promise.all([query.skip(skip).limit(size), Payment.countDocuments(studentScope(req))]);
      setPageHeaders(res, total, page, size);
      return apiResponse(res, { data: rows.map((row) => ({ id: String(row._id), invoiceId: String(row.billingId), amount: row.amount, currency: row.currency, reference: row.providerReference, method: row.paymentMethodType, status: row.status, paidAt: row.paidAt })) });
    } catch (error) { return next(error); }
  },
  async paymentMethods(req, res, next) {
    try { return apiResponse(res, { data: await studentService.paymentMethods(req) }); } catch (error) { return next(error); }
  },
  async addPaymentMethod(req, res, next) {
    try { return apiResponse(res, { status: 201, data: await studentService.addPaymentMethod(req, req.body) }); } catch (error) { return next(error); }
  },
  async updatePaymentMethod(req, res, next) {
    try {
      const { label } = z.object({ label: z.string() }).parse(req.body);
      return apiResponse(res, { data: await studentService.updatePaymentMethod(req, req.params.id, label) });
    } catch (error) { return next(error); }
  },
  async defaultPaymentMethod(req, res, next) {
    try { return apiResponse(res, { data: await studentService.setDefaultMethod(req, req.params.id) }); } catch (error) { return next(error); }
  },
  async deletePaymentMethod(req, res, next) {
    try { await studentService.removePaymentMethod(req, req.params.id); return apiResponse(res, { message: 'Payment method removed' }); } catch (error) { return next(error); }
  },
  async autoPay(req, res, next) {
    try { return apiResponse(res, { data: await studentService.autoPay(req) }); } catch (error) { return next(error); }
  },
  async setAutoPay(req, res, next) {
    try {
      const { enabled, paymentMethodId } = z.object({ enabled: z.boolean(), paymentMethodId: id.optional() }).parse(req.body);
      return apiResponse(res, { data: await studentService.setAutoPay(req, enabled, paymentMethodId) });
    } catch (error) { return next(error); }
  },
  async notifications(req, res, next) {
    try {
      const page = z.coerce.number().int().min(0).default(0).parse(req.query.page);
      const size = z.coerce.number().int().min(1).max(100).default(20).parse(req.query.size);
      const category = req.query.category ? z.enum(['ALL', 'COURSES', 'BILLING']).parse(req.query.category) : 'ALL';
      const unreadOnly = req.query.unreadOnly === 'true';
      const result = await studentService.notifications(req, { category, unreadOnly, page, size });
      setPageHeaders(res, result.total, page, size);
      return apiResponse(res, { data: result.rows });
    } catch (error) { return next(error); }
  },
  async notification(req, res, next) {
    try { return apiResponse(res, { data: await studentService.notification(req, req.params.id) }); } catch (error) { return next(error); }
  },
  async markRead(req, res, next) {
    try { await studentService.markNotificationRead(req, req.params.id); return apiResponse(res, { message: 'Notification marked as read' }); } catch (error) { return next(error); }
  },
  async markAllRead(req, res, next) {
    try { return apiResponse(res, { message: 'Notifications marked as read', data: await studentService.markAllNotificationsRead(req) }); } catch (error) { return next(error); }
  },
  async clearNotifications(req, res, next) {
    try { return apiResponse(res, { message: 'Notifications cleared', data: await studentService.clearNotifications(req) }); } catch (error) { return next(error); }
  },
  async renewalAnalytics(req, res, next) {
    try { return apiResponse(res, { data: await studentService.renewalAnalytics(req) }); } catch (error) { return next(error); }
  },
  async renewalReports(req, res, next) {
    try {
      const result = await studentService.invoices(req, { page: 0, size: 100, subscriptionOnly: true });
      return apiResponse(res, { data: result.rows });
    } catch (error) { return next(error); }
  },
};
