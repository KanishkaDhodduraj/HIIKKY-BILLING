import { z } from 'zod';
import Subscriber from '../../models/Subscriber.js';
import Subscription from '../../models/Subscription.js';
import Course from '../../models/Course.js';
import StudentCourse from '../../models/StudentCourse.js';
import StudentPaymentMethod from '../../models/StudentPaymentMethod.js';
import StudentNotificationState from '../../models/StudentNotificationState.js';
import Payment from '../../models/Payment.js';
import BillingNotification from '../../models/BillingNotification.js';
import AuditLog from '../../models/AuditLog.js';
import { apiResponse } from '../../utils/apiResponse.js';
import { pageSpec, regex, setPageHeaders } from '../../utils/query.js';
import { assertObjectId, primaryOrganizationId, tenantFilter } from '../shared/ownerRepository.js';
import { issueStudentInvite, issueTemporaryStudentInvite } from './studentInvite.service.js';
import { invalidateStudentSessionsById } from './studentSessions.js';

const idSchema = z.string().regex(/^[a-f\d]{24}$/i);
const emailSchema = z.string().trim().email().max(255).transform((value) => value.toLowerCase());
const csvCell = (value) => `"${String(value ?? '').replace(/[\r\n\t]/g, ' ').replace(/"/g, '""').replace(/^[\s\u0000-\u001f]*[=+@-]/, (match) => `'${match}`)}"`;
const inviteLimitError = 'Invitation email could not be sent. The student was created; retry the invitation.';
const view = (student) => ({
  id: String(student._id), organizationId: String(student.organizationId), fullName: student.fullName, email: student.email,
  phone: student.phone || '', status: student.accessBlocked ? 'BLOCKED' : student.status, accessBlocked: Boolean(student.accessBlocked),
  registrationStatus: student.registrationStatus, registrationReviewReason: student.registrationReviewReason || '',
  subscriptionId: student.subscriptionId ? String(student.subscriptionId) : null,
  inviteStatus: student.mustChangePassword && student.tempPasswordExpiresAt && student.tempPasswordExpiresAt <= new Date() && student.inviteStatus !== 'INVITE_FAILED'
    ? 'EXPIRED'
    : student.inviteStatus || (student.passwordSetAt ? 'active' : student.setPasswordTokenExpiresAt > new Date() ? 'invited' : 'not_invited'),
  mustChangePassword: Boolean(student.mustChangePassword),
  inviteSentAt: student.inviteSentAt,
  inviteCount: student.inviteCount || 0,
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

async function validateCourses(req, courseIds = []) {
  const uniqueIds = [...new Set(courseIds)];
  if (!uniqueIds.length) return [];
  const courses = await Course.find(tenantFilter(req, { _id: { $in: uniqueIds }, status: 'PUBLISHED' })).select('_id');
  if (courses.length !== uniqueIds.length) throw Object.assign(new Error('One or more courses are unavailable'), { status: 404 });
  return courses.map((course) => course._id);
}

async function auditStudent(req, student, action) {
  await AuditLog.create({
    actorType: 'OWNER', actorId: req.owner?.id || null, organizationId: student.organizationId,
    studentId: student._id, action, ip: req.ip || '',
  });
}

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  const source = String(text || '').replace(/^\uFEFF/, '');
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted && character === '"' && source[index + 1] === '"') { cell += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && source[index + 1] === '\n') index += 1;
      row.push(cell); cell = '';
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
    } else cell += character;
  }
  if (quoted) throw Object.assign(new Error('CSV contains an unterminated quoted field'), { status: 400 });
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function csvStudents(text) {
  const rows = parseCsv(text);
  if (!rows.length) throw Object.assign(new Error('CSV must include a header row'), { status: 400 });
  const headers = rows.shift().map((header) => header.trim().toLowerCase());
  if (!headers.includes('email') || !(headers.includes('name') || headers.includes('fullname'))) {
    throw Object.assign(new Error('CSV headers must include name (or fullName) and email'), { status: 400 });
  }
  if (rows.length > 500) throw Object.assign(new Error('CSV import is limited to 500 students'), { status: 413 });
  return rows.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] || ''])));
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
        name: z.string().trim().min(1).max(150).optional(),
        fullName: z.string().trim().min(1).max(150).optional(),
        email: emailSchema,
        phone: z.string().trim().max(50).optional().default(''),
        subscriptionId: idSchema.nullable().optional(),
        courseIds: z.array(idSchema).max(200).optional().default([]),
        sendInvite: z.boolean().default(true),
      }).refine((value) => value.name || value.fullName, { path: ['name'], message: 'Name is required' }).parse(req.body);
      if (await Subscriber.exists({ email: input.email })) throw Object.assign(new Error('A student with this email already exists'), { status: 409, fieldErrors: { email: 'This email is already in use' } });
      const subscriptionId = await validatePlan(req, input.subscriptionId);
      const courseIds = await validateCourses(req, input.courseIds);
      const student = await Subscriber.create({
        fullName: input.name || input.fullName,
        email: input.email,
        phone: input.phone,
        organizationId: primaryOrganizationId(req),
        subscriptionId,
        registrationStatus: 'APPROVED',
        status: 'ACTIVE',
        mustChangePassword: true,
      });
      if (courseIds.length) await StudentCourse.insertMany(courseIds.map((courseId) => ({ organizationId: student.organizationId, subscriberId: student._id, courseId })));
      await auditStudent(req, student, 'student.created');
      if (!input.sendInvite) return apiResponse(res, { status: 201, message: 'Student created without an invitation', data: view(student) });
      const invite = await issueTemporaryStudentInvite(student, { req, action: 'student.invite.sent' });
      if (!invite.sent) return res.status(502).json({ success: false, message: inviteLimitError, data: view(student), timestamp: new Date().toISOString(), fieldErrors: null });
      return apiResponse(res, { status: 201, message: 'Student created and invitation sent', data: view(student) });
    } catch (error) { return next(error); }
  },
  async bulkCreate(req, res, next) {
    try {
      if (typeof req.body !== 'string') throw Object.assign(new Error('Upload a CSV file as text/csv'), { status: 400 });
      const rows = csvStudents(req.body);
      const results = [];
      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const rowNumber = index + 2;
        try {
          const input = z.object({
            name: z.string().trim().min(1).max(150).optional(),
            fullname: z.string().trim().min(1).max(150).optional(),
            email: emailSchema,
            phone: z.string().trim().max(50).optional().default(''),
            subscriptionid: z.union([idSchema, z.literal('')]).nullable().optional().transform((value) => value || null),
          }).refine((value) => value.name || value.fullname, { path: ['name'], message: 'Name is required' }).parse(row);
          if (await Subscriber.exists({ email: input.email })) {
            results.push({ row: rowNumber, email: input.email, status: 'duplicate' });
            continue;
          }
          const subscriptionId = await validatePlan(req, input.subscriptionid);
          const student = await Subscriber.create({
            fullName: input.name || input.fullname,
            email: input.email,
            phone: input.phone,
            organizationId: primaryOrganizationId(req),
            subscriptionId,
            registrationStatus: 'APPROVED',
            status: 'ACTIVE',
            mustChangePassword: true,
          });
          await auditStudent(req, student, 'student.created');
          const invite = await issueTemporaryStudentInvite(student, { req, action: 'student.invite.sent' });
          results.push({ row: rowNumber, id: String(student._id), email: student.email, status: invite.sent ? 'created' : 'email_failed', inviteStatus: student.inviteStatus });
        } catch (error) {
          if (error?.code === 11000) results.push({ row: rowNumber, email: row.email || '', status: 'duplicate' });
          else if (error?.name === 'ZodError' || [400, 404].includes(error?.status)) {
            const fieldErrors = error.fieldErrors || Object.fromEntries(error.issues.map((issue) => [issue.path.join('.') || 'row', issue.message]));
            results.push({ row: rowNumber, email: row.email || '', status: 'invalid', fieldErrors });
          } else if (error?.status === 429) results.push({ row: rowNumber, email: row.email || '', status: 'email_failed', message: error.message });
          else return next(error);
        }
      }
      return apiResponse(res, { status: 200, message: 'CSV import processed', data: { results, total: results.length } });
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
      if (student.mustChangePassword) {
        const result = await issueTemporaryStudentInvite(student, { req, action: student.inviteSentAt ? 'student.invite.resent' : 'student.invite.sent' });
        if (!result.sent) return res.status(502).json({ success: false, message: inviteLimitError, data: view(student), timestamp: new Date().toISOString(), fieldErrors: null });
        return apiResponse(res, { message: 'Student invitation sent', data: view(student) });
      }
      if (student.passwordHash) throw Object.assign(new Error('This student has already changed their password. Use reset password instead.'), { status: 409 });
      await issueStudentInvite(student);
      await auditStudent(req, student, 'student.invite.sent');
      return apiResponse(res, { message: 'Student invitation sent', data: view(student) });
    } catch (error) { return next(error); }
  },
  async resendInvite(req, res, next) {
    try {
      const student = await scopedStudent(req, req.params.id);
      if (student.status === 'INACTIVE' || student.registrationStatus !== 'APPROVED') throw Object.assign(new Error('Approve and activate the student before inviting them'), { status: 400 });
      if (!student.mustChangePassword && student.passwordHash) throw Object.assign(new Error('This student has already changed their password. Use reset password instead.'), { status: 409 });
      if (student.mustChangePassword) {
        const result = await issueTemporaryStudentInvite(student, { req, action: 'student.invite.resent' });
        if (!result.sent) return res.status(502).json({ success: false, message: inviteLimitError, data: view(student), timestamp: new Date().toISOString(), fieldErrors: null });
      } else {
        await issueStudentInvite(student);
        await auditStudent(req, student, 'student.invite.sent');
      }
      return apiResponse(res, { message: 'Student invitation sent', data: view(student) });
    } catch (error) { return next(error); }
  },
  async resetPassword(req, res, next) {
    try {
      const student = await scopedStudent(req, req.params.id);
      if (student.status !== 'ACTIVE' || student.registrationStatus !== 'APPROVED') throw Object.assign(new Error('Only active students can have their password reset'), { status: 400 });
      if (student.mustChangePassword) throw Object.assign(new Error('This student must change their current invitation password first'), { status: 409 });
      const result = await issueTemporaryStudentInvite(student, { req, action: 'student.password.reset_by_owner' });
      if (!result.sent) return res.status(502).json({ success: false, message: inviteLimitError, data: view(student), timestamp: new Date().toISOString(), fieldErrors: null });
      return apiResponse(res, { message: 'Password reset invitation sent', data: view(student) });
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
      await auditStudent(req, student, 'student.invite.sent');
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
