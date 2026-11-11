import { z } from 'zod';
import Subscriber from '../../models/Subscriber.js';
import Subscription from '../../models/Subscription.js';
import Course from '../../models/Course.js';
import StudentCourse from '../../models/StudentCourse.js';
import StudentPaymentMethod from '../../models/StudentPaymentMethod.js';
import StudentNotificationState from '../../models/StudentNotificationState.js';
import Payment from '../../models/Payment.js';
import BillingNotification from '../../models/BillingNotification.js';
import { apiResponse } from '../../utils/apiResponse.js';
import { pageSpec, regex, setPageHeaders } from '../../utils/query.js';
import { assertObjectId, primaryOrganizationId, tenantFilter } from '../shared/ownerRepository.js';
import { issueStudentInvite } from './studentInvite.service.js';
import { invalidateStudentSessionsById } from './studentSessions.js';

const idSchema = z.string().regex(/^[a-f\d]{24}$/i);
const emailSchema = z.string().trim().email().max(255).transform((value) => value.toLowerCase());
const csvCell = (value) => `"${String(value ?? '').replace(/[\r\n\t]/g, ' ').replace(/"/g, '""').replace(/^[\s\u0000-\u001f]*[=+@-]/, (match) => `'${match}`)}"`;
const view = (student) => ({
  id: String(student._id), organizationId: String(student.organizationId), fullName: student.fullName, email: student.email,
  phone: student.phone || '', status: student.accessBlocked ? 'BLOCKED' : student.status, accessBlocked: Boolean(student.accessBlocked),
  registrationStatus: student.registrationStatus, registrationReviewReason: student.registrationReviewReason || '',
  subscriptionId: student.subscriptionId ? String(student.subscriptionId) : null,
  inviteStatus: student.passwordSetAt ? 'active' : student.setPasswordTokenExpiresAt > new Date() ? 'invited' : 'not_invited',
  startDate: student.startDate, endDate: student.endDate, autoPayEnabled: student.autoPayEnabled,
  createdAt: student.createdAt, updatedAt: student.updatedAt,
});

function studentFilter(req) {
  const filter = tenantFilter(req, {});
  if (req.query.status) {
    if (!['PENDING', 'ACTIVE', 'TRIALING', 'SUSPENDED', 'INACTIVE', 'BLOCKED'].includes(String(req.query.status))) throw Object.assign(new Error('Invalid student status'), { status: 400 });
    if (req.query.status === 'BLOCKED') filter.accessBlocked = true;
    else filter.status = req.query.status;
  }
  if (req.query.registrationStatus) {
    if (!['PENDING', 'APPROVED', 'REJECTED'].includes(String(req.query.registrationStatus))) throw Object.assign(new Error('Invalid registration status'), { status: 400 });
    filter.registrationStatus = req.query.registrationStatus;
  }
  if (req.query.search) {
    if (String(req.query.search).length > 200) throw Object.assign(new Error('Search must be at most 200 characters'), { status: 400 });
    const term = regex(String(req.query.search));
    filter.$or = [{ fullName: term }, { email: term }, { phone: term }];
  }
  return filter;
}

async function scopedStudent(req, id) {
  assertObjectId(id);
  const student = await Subscriber.findOne(tenantFilter(req, { _id: id }));
  if (!student) throw Object.assign(new Error('Student not found'), { status: 404 });
  return student;
}

async function validatePlan(req, subscriptionId) {
  if (!subscriptionId) return null;
  assertObjectId(subscriptionId);
  const plan = await Subscription.findOne(tenantFilter(req, { _id: subscriptionId, status: 'ACTIVE' }));
  if (!plan) throw Object.assign(new Error('Subscription plan not found'), { status: 404 });
  return plan._id;
}

export const studentsController = {
  async list(req, res, next) {
    try {
      const page = pageSpec(req.query, ['id', 'fullName', 'email', 'status', 'createdAt', 'updatedAt'], { sortBy: 'createdAt', sortDirection: 'DESC' });
      const filter = studentFilter(req);
      const [rows, total] = await Promise.all([Subscriber.find(filter).populate({ path: 'subscriptionId', select: 'planName' }).sort(page.sort).skip(page.skip).limit(page.size), Subscriber.countDocuments(filter)]);
      setPageHeaders(res, total, page.page, page.size);
      return apiResponse(res, { data: rows.map((row) => ({ ...view(row), planName: row.subscriptionId?.planName || '' })) });
    } catch (error) { return next(error); }
  },
  async get(req, res, next) {
    try { return apiResponse(res, { data: view(await scopedStudent(req, req.params.id)) }); } catch (error) { return next(error); }
  },
  async csv(req, res, next) {
    try {
      const filter = studentFilter(req);
      const total = await Subscriber.countDocuments(filter);
      if (total > 10000) throw Object.assign(new Error('CSV export exceeds 10,000 rows'), { status: 413 });
      const rows = await Subscriber.find(filter).populate({ path: 'subscriptionId', select: 'planName' }).sort({ fullName: 1, _id: 1 });
      const columns = ['fullName', 'email', 'phone', 'status', 'registrationStatus', 'subscriptionId', 'planName', 'startDate', 'endDate', 'createdAt'];
      res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="owner-students.csv"', 'Cache-Control': 'no-store' });
      return res.send([columns.map(csvCell).join(','), ...rows.map((row) => columns.map((key) => csvCell(key === 'subscriptionId' ? row.subscriptionId?._id : key === 'planName' ? row.subscriptionId?.planName : row[key] instanceof Date ? row[key].toISOString() : row[key])).join(','))].join('\r\n'));
    } catch (error) { return next(error); }
  },
  async create(req, res, next) {
    try {
      const input = z.object({
        fullName: z.string().trim().min(1).max(150),
        email: emailSchema,
        phone: z.string().trim().max(50).optional().default(''),
        subscriptionId: idSchema.nullable().optional(),
      }).parse(req.body);
      if (await Subscriber.exists({ email: input.email })) throw Object.assign(new Error('A student with this email already exists'), { status: 409, fieldErrors: { email: 'This email is already in use' } });
      const subscriptionId = await validatePlan(req, input.subscriptionId);
      const student = await Subscriber.create({ ...input, organizationId: primaryOrganizationId(req), subscriptionId, registrationStatus: 'APPROVED', status: 'ACTIVE' });
      await issueStudentInvite(student);
      return apiResponse(res, { status: 201, message: 'Student created and invitation sent', data: view(student) });
    } catch (error) { return next(error); }
  },
  async update(req, res, next) {
    try {
      const student = await scopedStudent(req, req.params.id);
      const input = z.object({
        fullName: z.string().trim().min(1).max(150).optional(),
        email: emailSchema.optional(),
        phone: z.string().trim().max(50).optional(),
        subscriptionId: idSchema.nullable().optional(),
        status: z.enum(['ACTIVE', 'TRIALING', 'SUSPENDED', 'INACTIVE']).optional(),
      }).parse(req.body);
      if (input.email && input.email !== student.email && await Subscriber.exists({ _id: { $ne: student._id }, email: input.email })) throw Object.assign(new Error('A student with this email already exists'), { status: 409, fieldErrors: { email: 'This email is already in use' } });
      if (input.subscriptionId !== undefined) input.subscriptionId = await validatePlan(req, input.subscriptionId);
      if (input.status === 'ACTIVE' && student.registrationStatus !== 'APPROVED') throw Object.assign(new Error('Approve the student registration before activating the account'), { status: 400 });
      Object.assign(student, input);
      await student.save();
      if (student.status === 'INACTIVE') await invalidateStudentSessionsById(student._id);
      return apiResponse(res, { data: view(student) });
    } catch (error) { return next(error); }
  },
  async invite(req, res, next) {
    try {
      const student = await scopedStudent(req, req.params.id);
      if (student.status === 'INACTIVE' || student.registrationStatus !== 'APPROVED') throw Object.assign(new Error('Approve and activate the student before inviting them'), { status: 400 });
      await issueStudentInvite(student);
      return apiResponse(res, { message: 'Student invitation sent', data: view(student) });
    } catch (error) { return next(error); }
  },
  async remove(req, res, next) {
    try {
      const student = await scopedStudent(req, req.params.id);
      await invalidateStudentSessionsById(student._id);
      await Promise.all([
        StudentCourse.deleteMany({ organizationId: student.organizationId, subscriberId: student._id }),
        StudentPaymentMethod.deleteMany({ organizationId: student.organizationId, subscriberId: student._id }),
        StudentNotificationState.deleteMany({ organizationId: student.organizationId, subscriberId: student._id }),
      ]);
      await student.deleteOne();
      return apiResponse(res, { message: 'Student deleted; invoice and payment history was retained' });
    } catch (error) { return next(error); }
  },
  async approve(req, res, next) {
    try {
      const student = await scopedStudent(req, req.params.id);
      if (student.registrationStatus !== 'PENDING') throw Object.assign(new Error('Only pending registrations can be approved'), { status: 409 });
      student.registrationStatus = 'APPROVED';
      student.registrationReviewReason = '';
      student.status = 'ACTIVE';
      await student.save();
      await issueStudentInvite(student);
      return apiResponse(res, { message: 'Registration approved and invitation sent', data: view(student) });
    } catch (error) { return next(error); }
  },
  async reject(req, res, next) {
    try {
      const { reason } = z.object({ reason: z.string().trim().min(1).max(1000) }).parse(req.body);
      const student = await scopedStudent(req, req.params.id);
      if (student.registrationStatus !== 'PENDING') throw Object.assign(new Error('Only pending registrations can be rejected'), { status: 409 });
      student.registrationStatus = 'REJECTED';
      student.registrationReviewReason = reason;
      student.status = 'INACTIVE';
      student.setPasswordTokenHash = null;
      student.setPasswordTokenExpiresAt = null;
      await student.save();
      await invalidateStudentSessionsById(student._id);
      return apiResponse(res, { message: 'Registration rejected', data: view(student) });
    } catch (error) { return next(error); }
  },
  async courses(req, res, next) {
    try {
      const student = await scopedStudent(req, req.params.id);
      const assignments = await StudentCourse.find(tenantFilter(req, { subscriberId: student._id })).populate({ path: 'courseId', select: 'courseCode courseName status' }).sort({ assignedAt: -1 });
      return apiResponse(res, { data: assignments.filter((item) => item.courseId).map((item) => ({ id: String(item.courseId._id), courseCode: item.courseId.courseCode, courseName: item.courseId.courseName, progressPercent: item.progressPercent, status: item.status, assignedAt: item.assignedAt })) });
    } catch (error) { return next(error); }
  },
  async assignCourses(req, res, next) {
    try {
      const student = await scopedStudent(req, req.params.id);
      const { courseIds } = z.object({ courseIds: z.array(idSchema).max(200) }).parse(req.body);
      const uniqueIds = [...new Set(courseIds)];
      const courses = await Course.find(tenantFilter(req, { _id: { $in: uniqueIds }, status: 'PUBLISHED' })).select('_id');
      if (courses.length !== uniqueIds.length) throw Object.assign(new Error('One or more courses are unavailable'), { status: 404 });
      const session = await StudentCourse.startSession();
      try {
        await session.withTransaction(async () => {
          await StudentCourse.deleteMany(tenantFilter(req, { subscriberId: student._id }), { session });
          if (courses.length) await StudentCourse.insertMany(courses.map((course) => ({ organizationId: student.organizationId, subscriberId: student._id, courseId: course._id })), { session });
        });
      } finally { await session.endSession(); }
      return apiResponse(res, { message: 'Course assignments updated', data: { assigned: courses.length } });
    } catch (error) { return next(error); }
  },
  async payments(req, res, next) {
    try {
      const student = await scopedStudent(req, req.params.id);
      const payments = await Payment.find(tenantFilter(req, { subscriberId: student._id })).sort({ paidAt: -1, _id: 1 }).limit(100);
      return apiResponse(res, { data: payments.map((payment) => ({ id: String(payment._id), billingId: String(payment.billingId), amount: payment.amount, currency: payment.currency, provider: payment.provider, reference: payment.providerReference, status: payment.status, paidAt: payment.paidAt })) });
    } catch (error) { return next(error); }
  },
  async notify(req, res, next) {
    try {
      const student = await scopedStudent(req, req.params.id);
      const input = z.object({ notificationType: z.enum(['ANNOUNCEMENT', 'SYSTEM_ALERT']).default('ANNOUNCEMENT'), subject: z.string().trim().min(1).max(200), message: z.string().trim().min(1).max(5000) }).parse(req.body);
      const notification = await BillingNotification.create({
        organizationId: student.organizationId, subscriberId: student._id,
        recipientEmail: student.email, recipientName: student.fullName, recipientGroup: 'INDIVIDUAL',
        notificationType: input.notificationType, subject: input.subject, message: input.message, status: 'QUEUED',
      });
      return apiResponse(res, { status: 201, message: 'Student notification queued', data: { id: String(notification._id), status: notification.status } });
    } catch (error) { return next(error); }
  },
};
