import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import BusinessOwner from '../../models/BusinessOwner.js';
import Organization from '../../models/Organization.js';
import Subscriber from '../../models/Subscriber.js';
import { sendSetPasswordLink } from './mail.service.js';

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const newToken = () => crypto.randomBytes(32).toString('base64url');
const passwordSchema = z.string().min(12).max(72).refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be at most 72 UTF-8 bytes');
const idSchema = z.string().regex(/^[a-f\d]{24}$/i);

function safeStudent(student, organization) {
  return {
    id: String(student._id),
    organizationId: String(organization._id),
    organizationName: organization.name,
    fullName: student.fullName,
    email: student.email,
    phone: student.phone || '',
    status: student.status,
    subscriptionId: student.subscriptionId ? String(student.subscriptionId) : null,
    startDate: student.startDate,
    endDate: student.endDate,
    autoPayEnabled: student.autoPayEnabled,
    emailNotificationsEnabled: student.emailNotificationsEnabled,
    avatarData: student.avatarData || '',
    createdAt: student.createdAt,
  };
}

export const authService = {
  async organizations() {
    const organizations = await Organization.find({ status: 'ACTIVE' }).select('name ownerId').sort({ name: 1 });
    const activeOwners = await BusinessOwner.find({ _id: { $in: organizations.map((item) => item.ownerId).filter(Boolean) }, status: 'ACTIVE' }).select('_id');
    const allowed = new Set(activeOwners.map((owner) => String(owner._id)));
    return organizations.filter((organization) => allowed.has(String(organization.ownerId))).map((organization) => ({ id: String(organization._id), name: organization.name }));
  },

  async register(input) {
    const values = z.object({
      organizationId: idSchema,
      fullName: z.string().trim().min(1).max(150),
      email: z.string().trim().email().max(255).transform((value) => value.toLowerCase()),
      phone: z.string().trim().max(50).optional().default(''),
    }).parse(input);
    const organization = await Organization.findOne({ _id: values.organizationId, status: 'ACTIVE' });
    if (!organization || !organization.ownerId || !await BusinessOwner.exists({ _id: organization.ownerId, status: 'ACTIVE' })) {
      throw Object.assign(new Error('Organization is not accepting registrations'), { status: 404 });
    }
    if (await Subscriber.exists({ email: values.email })) {
      throw Object.assign(new Error('An account with this email already exists'), { status: 409, fieldErrors: { email: 'This email is already registered' } });
    }
    const student = await Subscriber.create({
      ...values,
      organizationId: organization._id,
      status: 'PENDING',
      registrationStatus: 'PENDING',
      passwordHash: null,
    });
    return { id: String(student._id), fullName: student.fullName, email: student.email, organizationName: organization.name, status: student.registrationStatus };
  },

  async login(email, password, organizationId) {
    const normalizedEmail = z.string().trim().email().max(255).parse(email).toLowerCase();
    const students = await Subscriber.find({ email: normalizedEmail }).select('+passwordHash');
    const matches = organizationId ? students.filter((student) => String(student.organizationId) === organizationId) : students;
    if (matches.length !== 1) return null;
    const student = matches[0];
    if (!student.passwordHash || !(await bcrypt.compare(password, student.passwordHash))) return null;
    const organization = await Organization.findOne({ _id: student.organizationId, status: 'ACTIVE' });
    if (!organization?.ownerId || !await BusinessOwner.exists({ _id: organization.ownerId, status: 'ACTIVE' })) return null;
    if (student.accessBlocked || !['ACTIVE', 'TRIALING'].includes(student.status) || student.registrationStatus !== 'APPROVED') return null;
    return { student, organization, profile: safeStudent(student, organization) };
  },

  async issueSetPassword(student, { invalidatePassword = false } = {}) {
    const token = newToken();
    student.setPasswordTokenHash = hashToken(token);
    student.setPasswordTokenExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    if (invalidatePassword) {
      student.passwordHash = null;
      student.passwordSetAt = null;
    }
    await student.save();
    await sendSetPasswordLink(student, token);
  },

  async setPassword(token, password) {
    const safePassword = passwordSchema.parse(password);
    const student = await Subscriber.findOne({ setPasswordTokenHash: hashToken(token), setPasswordTokenExpiresAt: { $gt: new Date() } }).select('+passwordHash +setPasswordTokenHash');
    if (!student || student.registrationStatus !== 'APPROVED' || student.accessBlocked || student.status === 'INACTIVE') {
      throw Object.assign(new Error('This password link is invalid or expired'), { status: 400 });
    }
    const organization = await Organization.findOne({ _id: student.organizationId, status: 'ACTIVE' });
    if (!organization?.ownerId || !await BusinessOwner.exists({ _id: organization.ownerId, status: 'ACTIVE' })) {
      throw Object.assign(new Error('This account is currently unavailable'), { status: 403 });
    }
    student.passwordHash = await bcrypt.hash(safePassword, 12);
    student.passwordSetAt = new Date();
    student.setPasswordTokenHash = null;
    student.setPasswordTokenExpiresAt = null;
    if (student.status === 'PENDING') student.status = 'ACTIVE';
    await student.save();
    return { student, organization };
  },

  async forgotPassword(email) {
    const normalizedEmail = z.string().trim().email().max(255).parse(email).toLowerCase();
    const student = await Subscriber.findOne({ email: normalizedEmail, status: { $in: ['ACTIVE', 'TRIALING'] }, registrationStatus: 'APPROVED' });
    if (student && !student.accessBlocked) await this.issueSetPassword(student, { invalidatePassword: true });
  },

  async updateProfile(student, input) {
    const values = z.object({
      currentPassword: z.string().min(1),
      fullName: z.string().trim().min(1).max(150).optional(),
      email: z.string().trim().email().max(255).transform((value) => value.toLowerCase()).optional(),
      phone: z.string().trim().max(50).optional(),
      avatarData: z.string().max(1400000).optional(),
      emailNotificationsEnabled: z.boolean().optional(),
      newPassword: passwordSchema.optional(),
    }).refine((value) => Object.keys(value).some((key) => key !== 'currentPassword'), { message: 'Provide at least one profile change' }).parse(input);
    const currentPassword = values.currentPassword;
    delete values.currentPassword;
    const account = await Subscriber.findById(student._id).select('+passwordHash');
    if (!account?.passwordHash || !(await bcrypt.compare(currentPassword, account.passwordHash))) {
      throw Object.assign(new Error('Current password is incorrect'), { status: 401, fieldErrors: { currentPassword: 'Current password is incorrect' } });
    }
    if (values.email && values.email !== account.email && await Subscriber.exists({ _id: { $ne: account._id }, email: values.email })) {
      throw Object.assign(new Error('An account with this email already exists'), { status: 409, fieldErrors: { email: 'This email is already registered' } });
    }
    if (values.newPassword) {
      account.passwordHash = await bcrypt.hash(values.newPassword, 12);
      account.passwordSetAt = new Date();
    }
    delete values.newPassword;
    Object.assign(account, values);
    await account.save();
    return account;
  },

  safeStudent,
};
