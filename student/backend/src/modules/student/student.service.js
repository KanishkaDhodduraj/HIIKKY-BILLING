import crypto from 'node:crypto';
import { z } from 'zod';
import Billing from '../../models/Billing.js';
import BillingNotification from '../../models/BillingNotification.js';
import Discount from '../../models/Discount.js';
import Payment from '../../models/Payment.js';
import StudentCourse from '../../models/StudentCourse.js';
import StudentNotificationState from '../../models/StudentNotificationState.js';
import StudentPaymentMethod from '../../models/StudentPaymentMethod.js';
import Subscriber from '../../models/Subscriber.js';
import Subscription from '../../models/Subscription.js';
import { studentRepository, studentScope } from './student.repository.js';
import { paymentAdapter } from './paymentAdapter.js';

const notFound = (name) => Object.assign(new Error(`${name} not found`), { status: 404 });
const idSchema = z.string().regex(/^[a-f\d]{24}$/i);
const money = (value) => Math.round((Number(value) || 0) * 100) / 100;
const invoiceNumber = () => `INV-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
const paymentView = (payment) => ({
  id: String(payment._id), invoiceId: String(payment.billingId), amount: payment.amount, currency: payment.currency,
  provider: payment.provider, providerReference: payment.providerReference, paymentMethodType: payment.paymentMethodType,
  status: payment.status, paidAt: payment.paidAt,
});
const invoiceView = (invoice) => ({
  id: String(invoice._id), invoiceNumber: invoice.invoiceNumber, paymentName: invoice.paymentName,
  subscriptionId: invoice.subscriptionId ? String(invoice.subscriptionId._id || invoice.subscriptionId) : null,
  planName: invoice.subscriptionId?.planName || '', courseId: invoice.courseId ? String(invoice.courseId) : null,
  dueDate: invoice.dueDate, paidDate: invoice.paidDate, amount: invoice.amount, originalAmount: invoice.originalAmount,
  discountAmount: invoice.discountAmount, paymentStatus: invoice.paymentStatus, paymentMethod: invoice.paymentMethod,
  createdAt: invoice.createdAt,
});
const planView = (plan) => ({
  id: String(plan._id), planName: plan.planName, description: plan.description, price: plan.price,
  billingCycle: plan.billingCycle, maxUsers: plan.maxUsers, status: plan.status,
});

async function createInvoice(req, { plan, discountCode = '', applyPlanAfterPayment = false, paymentName } = {}) {
  const session = await Billing.startSession();
  let invoice;
  try {
    await session.withTransaction(async () => {
      let discountAmount = 0;
      if (discountCode) {
        const code = discountCode.trim().toUpperCase();
        const discount = await Discount.findOne({ organizationId: req.organization._id, code, status: 'ACTIVE' }).session(session);
        const now = new Date();
        if (!discount || (discount.startDate && discount.startDate > now) || (discount.endDate && discount.endDate < now) || (discount.maxUses && discount.usedCount >= discount.maxUses)) {
          throw Object.assign(new Error('Discount is unavailable'), { status: 400, fieldErrors: { discountCode: 'Code is invalid, expired, or exhausted' } });
        }
        if (discount.subscriptionId && String(discount.subscriptionId) !== String(plan._id)) {
          throw Object.assign(new Error('Discount does not apply to this plan'), { status: 400, fieldErrors: { discountCode: 'Code does not apply to this plan' } });
        }
        discountAmount = Math.min(plan.price, discount.discountType === 'PERCENTAGE' ? plan.price * discount.discountValue / 100 : discount.discountValue);
        discount.usedCount += 1;
        await discount.save({ session });
      }
      [invoice] = await Billing.create([{
        organizationId: req.organization._id,
        subscriberId: req.student._id,
        subscriptionId: plan._id,
        invoiceNumber: invoiceNumber(),
        paymentName: paymentName || `${plan.planName} subscription`,
        dueDate: new Date(),
        amount: money(Math.max(0, plan.price - discountAmount)),
        originalAmount: plan.price,
        discountAmount: money(discountAmount),
        paymentStatus: 'UNPAID',
        applyPlanAfterPayment,
      }], { session });
    });
  } finally { await session.endSession(); }
  return invoice;
}

export const studentService = {
  async dashboard(req) {
    const [invoices, payments, plans] = await Promise.all([
      studentRepository.invoices(req),
      studentRepository.payments(req),
      req.student.subscriptionId ? Subscription.findOne({ _id: req.student.subscriptionId, organizationId: req.organization._id }) : null,
    ]);
    const unpaid = invoices.filter((invoice) => invoice.paymentStatus !== 'PAID');
    const nextDue = unpaid.filter((invoice) => invoice.dueDate).sort((a, b) => a.dueDate - b.dueDate)[0];
    const courses = await studentRepository.courses(req).sort({ courseName: 1 }).limit(100);
    const progress = await studentRepository.courseProgress(req, courses.map((course) => course._id));
    const progressByCourse = new Map(progress.map((item) => [String(item.courseId), item]));
    const activityByDay = new Map();
    for (const activity of progress) {
      if (!activity.lastAccessedAt) continue;
      const day = activity.lastAccessedAt.toISOString().slice(0, 10);
      activityByDay.set(day, (activityByDay.get(day) || 0) + 1);
    }
    return {
      summary: {
        hoursLearned: 0,
        coursesCompleted: progress.filter((item) => item.status === 'COMPLETED').length,
        learningStreak: 0,
        activeDays: new Set(progress.map((item) => item.lastAccessedAt?.toISOString().slice(0, 10)).filter(Boolean)).size,
        totalCourses: courses.length,
        totalPaid: money(payments.reduce((sum, item) => sum + item.amount, 0)),
        unpaidTotal: money(unpaid.reduce((sum, item) => sum + item.amount, 0)),
        nextDueDate: nextDue?.dueDate || null,
      },

      async updatePaymentMethod(req, id, label) {
        if (!idSchema.safeParse(id).success) throw Object.assign(new Error('Invalid payment method id'), { status: 400 });
        const safeLabel = z.string().trim().min(1).max(80).parse(label);
        const method = await StudentPaymentMethod.findOneAndUpdate(studentScope(req, { _id: id }), { $set: { label: safeLabel } }, { new: true, runValidators: true });
        if (!method) throw notFound('Payment method');
        return { id: String(method._id), label: method.label };
      },
      plan: plans ? { ...planView(plans), startDate: req.student.startDate, endDate: req.student.endDate, status: req.student.status, autoPayEnabled: req.student.autoPayEnabled } : null,
      learningActivity: [...activityByDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count })),
      courses: courses.slice(0, 4).map((course) => ({ id: String(course._id), courseName: course.courseName, progressPercent: progressByCourse.get(String(course._id))?.progressPercent || 0 })),
      recentInvoices: invoices.slice(0, 5).map(invoiceView),
    };
  },

  async courses(req, { category, search, sortBy = 'recent', page = 0, size = 20 } = {}) {
    const filter = {};
    if (category && category !== 'All') filter.category = new RegExp(`^${category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    if (search) filter.$or = [{ courseName: new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }, { courseCode: new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }, { instructorName: new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }];
    const sort = sortBy === 'name' ? { courseName: 1, _id: 1 } : { createdAt: -1, _id: 1 };
    const [courses, total, assigned] = await Promise.all([
      studentRepository.courses(req, filter).sort(sort).skip(page * size).limit(size),
      studentRepository.courses(req, filter).countDocuments(),
      StudentCourse.find(studentScope(req)),
    ]);
    const progress = new Map(assigned.map((row) => [String(row.courseId), row]));
    return { rows: courses.map((course) => ({
      id: String(course._id), courseCode: course.courseCode, courseName: course.courseName,
      category: course.category, instructorName: course.instructorName, durationHours: course.durationHours,
      progressPercent: progress.get(String(course._id))?.progressPercent || 0,
      lastAccessedAt: progress.get(String(course._id))?.lastAccessedAt || null,
      status: progress.get(String(course._id))?.status || 'ACTIVE',
      locked: false,
    })), total };
  },

  async courseDetail(req, courseId) {
    if (!idSchema.safeParse(courseId).success) throw Object.assign(new Error('Invalid course id'), { status: 400 });
    const course = await studentRepository.course(req, courseId);
    if (!course) throw notFound('Course');
    const [enrollment, installments] = await Promise.all([
      StudentCourse.findOne(studentScope(req, { courseId: course._id })),
      studentRepository.installments(req, course._id),
    ]);
    return {
      id: String(course._id), courseCode: course.courseCode, courseName: course.courseName, category: course.category,
      instructorName: course.instructorName, durationHours: course.durationHours, progressPercent: enrollment?.progressPercent || 0,
      lastAccessedAt: enrollment?.lastAccessedAt || null,
      installments: installments.map((item) => ({ id: String(item._id), installmentNumber: item.installmentNumber, installmentName: item.installmentName, amount: item.amount, dueDate: item.dueDate })),
    };
  },

  async openCourse(req, courseId) {
    const course = await studentRepository.course(req, courseId);
    if (!course) throw notFound('Course');
    const record = await StudentCourse.findOneAndUpdate(
      studentScope(req, { courseId: course._id }),
      { $set: { lastAccessedAt: new Date() }, $setOnInsert: { organizationId: req.organization._id, subscriberId: req.student._id, courseId: course._id } },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
    );
    return { courseId: String(course._id), lastAccessedAt: record.lastAccessedAt, progressPercent: record.progressPercent };
  },

  async updateCourseProgress(req, courseId, progressPercent) {
    const course = await studentRepository.course(req, courseId);
    if (!course) throw notFound('Course');
    const row = await StudentCourse.findOneAndUpdate(
      studentScope(req, { courseId: course._id }),
      { $set: { progressPercent, status: progressPercent === 100 ? 'COMPLETED' : 'ACTIVE', lastAccessedAt: new Date() }, $setOnInsert: { organizationId: req.organization._id, subscriberId: req.student._id, courseId: course._id } },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
    );
    return { courseId: String(course._id), progressPercent: row.progressPercent, status: row.status, lastAccessedAt: row.lastAccessedAt };
  },

  async plans(req) {
    const plans = await studentRepository.plans(req);
    return {
      currentPlanId: req.student.subscriptionId ? String(req.student.subscriptionId) : null,
      plans: plans.map((plan) => ({ ...planView(plan), isCurrent: String(plan._id) === String(req.student.subscriptionId) })),
      activatedAt: req.student.startDate,
      expiresAt: req.student.endDate,
      autoPayEnabled: req.student.autoPayEnabled,
    };
  },

  async changePlan(req, planId, discountCode = '') {
    if (!idSchema.safeParse(planId).success) throw Object.assign(new Error('Invalid plan id'), { status: 400 });
    const plan = await studentRepository.plan(req, planId);
    if (!plan) throw notFound('Subscription plan');
    if (String(plan._id) === String(req.student.subscriptionId)) throw Object.assign(new Error('This is already your current plan'), { status: 409 });
    const invoice = await createInvoice(req, { plan, discountCode, applyPlanAfterPayment: true, paymentName: `Upgrade to ${plan.planName}` });
    return invoiceView(invoice);
  },

  async renew(req, discountCode = '') {
    if (!req.student.subscriptionId) throw Object.assign(new Error('No active plan to renew'), { status: 400 });
    const plan = await studentRepository.plan(req, String(req.student.subscriptionId));
    if (!plan) throw notFound('Subscription plan');
    return invoiceView(await createInvoice(req, { plan, discountCode, paymentName: `${plan.planName} renewal` }));
  },

  async cancelPlan(req) {
    const student = await Subscriber.findOne(studentScope(req));
    if (!student) throw notFound('Student');
    student.endDate = new Date();
    student.autoPayEnabled = false;
    await student.save();
    return { subscriptionId: student.subscriptionId ? String(student.subscriptionId) : null, status: 'CANCELLED', endDate: student.endDate, autoPayEnabled: false };
  },

  async invoices(req, { status, search, fromDate, toDate, page = 0, size = 20 } = {}) {
    const filter = {};
    if (status) {
      const normalized = status.toUpperCase();
      if (!['PAID', 'UNPAID', 'OVERDUE'].includes(normalized)) throw Object.assign(new Error('Invalid invoice status'), { status: 400 });
      filter.paymentStatus = normalized;
    }
    if (search) filter.$or = [{ invoiceNumber: new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }, { paymentName: new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }];
    if (Boolean(fromDate) !== Boolean(toDate)) throw Object.assign(new Error('fromDate and toDate must be provided together'), { status: 400 });
    if (fromDate) {
      const from = new Date(`${fromDate}T00:00:00.000Z`), to = new Date(`${toDate}T23:59:59.999Z`);
      if (Number.isNaN(+from) || Number.isNaN(+to) || from > to) throw Object.assign(new Error('Invalid date range'), { status: 400 });
      filter.dueDate = { $gte: from, $lte: to };
    }
    const query = studentRepository.invoices(req, filter).populate({ path: 'subscriptionId', select: 'planName' });
    const [invoices, total] = await Promise.all([query.skip(page * size).limit(size), studentRepository.invoices(req, filter).countDocuments()]);
    return { rows: invoices.map(invoiceView), total };
  },

  async invoice(req, id) {
    if (!idSchema.safeParse(id).success) throw Object.assign(new Error('Invalid invoice id'), { status: 400 });
    const invoice = await studentRepository.invoice(req, id);
    if (!invoice) throw notFound('Invoice');
    await invoice.populate({ path: 'subscriptionId', select: 'planName' });
    return invoiceView(invoice);
  },

  async pay(req, invoiceId, idempotencyKey, paymentMethodId) {
    if (!idSchema.safeParse(invoiceId).success) throw Object.assign(new Error('Invalid invoice id'), { status: 400 });
    const key = z.string().trim().min(8).max(128).parse(idempotencyKey);
    const existing = await Payment.findOne(studentScope(req, { billingId: invoiceId }));
    if (existing) return paymentView(existing);
    const invoice = await studentRepository.invoice(req, invoiceId);
    if (!invoice) throw notFound('Invoice');
    if (invoice.paymentStatus === 'PAID') throw Object.assign(new Error('Invoice is already paid'), { status: 409 });
    if (invoice.amount <= 0) throw Object.assign(new Error('Zero-value invoices must be settled by the owner'), { status: 400 });
    let method = null;
    if (paymentMethodId) {
      method = await StudentPaymentMethod.findOne(studentScope(req, { _id: paymentMethodId }));
      if (!method) throw notFound('Payment method');
    } else {
      method = await StudentPaymentMethod.findOne(studentScope(req, { isDefault: true }));
    }
    const charge = await paymentAdapter.charge({ amount: invoice.amount, currency: 'USD', subscriberId: String(req.student._id), invoiceId: String(invoice._id) });
    const paidAt = new Date();
    const session = await Billing.startSession();
    let payment;
    try {
      await session.withTransaction(async () => {
        const updated = await Billing.findOneAndUpdate(
          { _id: invoice._id, organizationId: req.organization._id, subscriberId: req.student._id, paymentStatus: { $ne: 'PAID' } },
          { $set: { paymentStatus: 'PAID', paidDate: paidAt, paymentMethod: `SANDBOX_${method?.type || 'CARD'}` } },
          { new: true, session },
        );
        if (!updated) throw Object.assign(new Error('Invoice is already paid'), { status: 409 });
        [payment] = await Payment.create([{
          organizationId: req.organization._id,
          subscriberId: req.student._id,
          billingId: updated._id,
          idempotencyKey: key,
          amount: updated.amount,
          currency: 'USD',
          provider: charge.provider,
          providerReference: charge.providerReference,
          paymentMethodType: method?.type || 'CARD',
          paidAt,
        }], { session });
        if (updated.applyPlanAfterPayment && updated.subscriptionId) {
          const plan = await Subscription.findOne({ _id: updated.subscriptionId, organizationId: req.organization._id, status: 'ACTIVE' }).session(session);
          if (!plan) throw notFound('Subscription plan');
          const endDate = plan.billingCycle === 'ONE_TIME' ? null : new Date(paidAt);
          if (plan.billingCycle === 'MONTHLY') endDate.setMonth(endDate.getMonth() + 1);
          if (plan.billingCycle === 'YEARLY') endDate.setFullYear(endDate.getFullYear() + 1);
          await Subscriber.updateOne(studentScope(req), { $set: { subscriptionId: plan._id, startDate: paidAt, endDate } }, { session });
        }
      });
    } catch (error) {
      if (error?.code === 11000) {
        const duplicate = await Payment.findOne(studentScope(req, { billingId: invoice._id }));
        if (duplicate) return paymentView(duplicate);
      }
      throw error;
    } finally { await session.endSession(); }
    return paymentView(payment);
  },

  async paymentMethods(req) {
    return (await studentRepository.paymentMethods(req)).map((method) => ({
      id: String(method._id), type: method.type, label: method.label, brand: method.brand, lastFour: method.lastFour,
      expiryMonth: method.expiryMonth, expiryYear: method.expiryYear, isDefault: method.isDefault,
      storage: 'sandbox token; no card number or security code stored',
    }));
  },

  async addPaymentMethod(req, input) {
    const values = z.object({
      type: z.enum(['CARD', 'UPI', 'BANK']),
      label: z.string().trim().min(1).max(80),
      brand: z.string().trim().max(30).optional().default(''),
      lastFour: z.string().regex(/^\d{4}$/).optional().default(''),
      expiryMonth: z.number().int().min(1).max(12).nullable().optional(),
      expiryYear: z.number().int().min(2020).max(2200).nullable().optional(),
    }).parse(input);
    const count = await StudentPaymentMethod.countDocuments(studentScope(req));
    const method = await StudentPaymentMethod.create({
      ...values,
      organizationId: req.organization._id,
      subscriberId: req.student._id,
      tokenReference: `sandbox_${crypto.randomBytes(20).toString('hex')}`,
      isDefault: count === 0,
    });
    return { id: String(method._id), type: method.type, label: method.label, brand: method.brand, lastFour: method.lastFour, expiryMonth: method.expiryMonth, expiryYear: method.expiryYear, isDefault: method.isDefault };
  },

  async setDefaultMethod(req, id) {
    if (!idSchema.safeParse(id).success) throw Object.assign(new Error('Invalid payment method id'), { status: 400 });
    const method = await StudentPaymentMethod.findOne(studentScope(req, { _id: id }));
    if (!method) throw notFound('Payment method');
    await StudentPaymentMethod.updateMany(studentScope(req), { $set: { isDefault: false } });
    method.isDefault = true;
    await method.save();
    return { id: String(method._id), isDefault: true };
  },

  async removePaymentMethod(req, id) {
    if (!idSchema.safeParse(id).success) throw Object.assign(new Error('Invalid payment method id'), { status: 400 });
    const method = await StudentPaymentMethod.findOne(studentScope(req, { _id: id }));
    if (!method) throw notFound('Payment method');
    await method.deleteOne();
    if (method.isDefault) {
      const next = await StudentPaymentMethod.findOne(studentScope(req)).sort({ createdAt: 1, _id: 1 });
      if (next) { next.isDefault = true; await next.save(); }
    }
  },

  async autoPay(req) {
    const [method, invoices] = await Promise.all([
      StudentPaymentMethod.findOne(studentScope(req, { isDefault: true })),
      studentRepository.invoices(req, { paymentStatus: { $ne: 'PAID' } }).sort({ dueDate: 1 }).limit(5),
    ]);
    return {
      enabled: req.student.autoPayEnabled,
      paymentMethod: method ? { id: String(method._id), type: method.type, label: method.label, lastFour: method.lastFour } : null,
      schedule: invoices.map((invoice) => ({ invoiceNumber: invoice.invoiceNumber, dueDate: invoice.dueDate, amount: invoice.amount, status: invoice.paymentStatus })),
      automaticChargesSupported: false,
      message: 'Sandbox payment methods are stored as tokens. Automatic recurring charges are not scheduled.',
    };
  },

  async setAutoPay(req, enabled, paymentMethodId) {
    if (enabled) {
      const filter = paymentMethodId ? { _id: paymentMethodId } : { isDefault: true };
      if (!await StudentPaymentMethod.findOne(studentScope(req, filter))) {
        throw Object.assign(new Error('Add or select a payment method before enabling Auto Pay'), { status: 400, fieldErrors: { paymentMethodId: 'A saved payment method is required' } });
      }
    }
    await Subscriber.updateOne(studentScope(req), { $set: { autoPayEnabled: enabled } });
    return { enabled, automaticChargesSupported: false };
  },

  async notifications(req, { category, unreadOnly, page = 0, size = 20 } = {}) {
    const notices = await studentRepository.notifications(req).limit(100);
    const states = await studentRepository.notificationStates(req, notices.map((notice) => notice._id));
    const stateById = new Map(states.map((state) => [String(state.notificationId), state]));
    const filtered = notices.map((notice) => {
      const state = stateById.get(String(notice._id));
      const type = notice.notificationType === 'BILLING' || notice.billingId ? 'BILLING' : 'COURSES';
      return {
        id: String(notice._id), subject: notice.subject, message: notice.message, type,
        createdAt: notice.createdAt, read: Boolean(state?.readAt), cleared: Boolean(state?.clearedAt),
        status: notice.status,
      };
    }).filter((notice) => !notice.cleared && (!category || category === 'ALL' || notice.type === category) && (!unreadOnly || !notice.read));
    return { rows: filtered.slice(page * size, (page + 1) * size), total: filtered.length };
  },

  async notification(req, id) {
    if (!idSchema.safeParse(id).success) throw Object.assign(new Error('Invalid notification id'), { status: 400 });
    const notice = await studentRepository.notifications(req, { _id: id }).then((rows) => rows[0]);
    if (!notice) throw notFound('Notification');
    const [state] = await studentRepository.notificationStates(req, [notice._id]);
    return { id: String(notice._id), subject: notice.subject, message: notice.message, type: notice.notificationType === 'BILLING' || notice.billingId ? 'BILLING' : 'COURSES', createdAt: notice.createdAt, read: Boolean(state?.readAt), status: notice.status };
  },

  async markNotificationRead(req, id) {
    if (!idSchema.safeParse(id).success) throw Object.assign(new Error('Invalid notification id'), { status: 400 });
    const notification = await studentRepository.notifications(req, { _id: id }).then((rows) => rows[0]);
    if (!notification) throw notFound('Notification');
    await StudentNotificationState.findOneAndUpdate(
      studentScope(req, { notificationId: notification._id }),
      { $set: { readAt: new Date(), clearedAt: null }, $setOnInsert: { organizationId: req.organization._id, subscriberId: req.student._id, notificationId: notification._id } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  },

  async markAllNotificationsRead(req) {
    const notices = await studentRepository.notifications(req).select('_id');
    const now = new Date();
    if (notices.length) {
      await StudentNotificationState.bulkWrite(notices.map((notice) => ({
        updateOne: {
          filter: studentScope(req, { notificationId: notice._id }),
          update: { $set: { readAt: now, clearedAt: null }, $setOnInsert: { organizationId: req.organization._id, subscriberId: req.student._id, notificationId: notice._id } },
          upsert: true,
        },
      })));
    }
    return { updated: notices.length };
  },

  async clearNotifications(req) {
    const notices = await studentRepository.notifications(req).select('_id');
    const now = new Date();
    if (notices.length) {
      await StudentNotificationState.bulkWrite(notices.map((notice) => ({
        updateOne: {
          filter: studentScope(req, { notificationId: notice._id }),
          update: { $set: { clearedAt: now }, $setOnInsert: { organizationId: req.organization._id, subscriberId: req.student._id, notificationId: notice._id } },
          upsert: true,
        },
      })));
    }
    return { cleared: notices.length };
  },

  async renewalAnalytics(req) {
    const payments = await studentRepository.payments(req);
    const monthly = new Map();
    for (const payment of payments) {
      const month = payment.paidAt.toISOString().slice(0, 7);
      const item = monthly.get(month) || { month, amount: 0, count: 0 };
      item.amount = money(item.amount + payment.amount);
      item.count += 1;
      monthly.set(month, item);
    }
    return [...monthly.values()].sort((a, b) => a.month.localeCompare(b.month));
  },
};
