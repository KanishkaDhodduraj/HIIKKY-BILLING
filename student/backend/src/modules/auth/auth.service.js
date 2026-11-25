import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import BusinessOwner from '../../models/BusinessOwner.js';
import Organization from '../../models/Organization.js';
import Subscriber from '../../models/Subscriber.js';
import AuditLog from '../../models/AuditLog.js';
import LoginThrottle from '../../models/LoginThrottle.js';
import { sendPasswordChanged, sendSetPasswordLink } from './mail.service.js';
import { commonPasswords } from './commonPasswords.js';

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const newToken = () => crypto.randomBytes(32).toString('base64url');
const passwordSchema = z.string().min(12).max(72).refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be at most 72 UTF-8 bytes');
const changePasswordSchema = z.string().min(10, 'Password must be at least 10 characters').max(72).refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be at most 72 UTF-8 bytes');
const idSchema = z.string().regex(/^[a-f\d]{24}$/i);
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('HIIKKY-dummy-password-that-never-exists', 12);
const loginWindowMs = 15 * 60 * 1000;

function loginThrottleKey(ip) {
  return crypto.createHash('sha256').update(String(ip || 'unknown')).digest('hex');
}

async function loginRateLimited(ip) {
  const key = loginThrottleKey(ip);
  const bucket = await LoginThrottle.findOne({ key, expiresAt: { $gt: new Date() } });
  return Boolean(bucket && bucket.attempts >= 10);
}

async function recordLoginFailure(ip) {
  const now = new Date();
  const key = loginThrottleKey(ip);
  await LoginThrottle.findOneAndUpdate({ key }, [{
    $set: {
      attempts: { $cond: [{ $gt: ['$expiresAt', now] }, { $add: [{ $ifNull: ['$attempts', 0] }, 1] }, 1] },
      expiresAt: { $cond: [{ $gt: ['$expiresAt', now] }, '$expiresAt', new Date(now.getTime() + loginWindowMs)] },
    },
  }], { upsert: true, new: true });
}

async function clearLoginAttempts(ip) {
  await LoginThrottle.deleteOne({ key: loginThrottleKey(ip) });
}

async function noteFailedLogin(student, ip) {
  if (!student) return;
  const now = new Date();
  const account = await Subscriber.findByIdAndUpdate(student._id, { $inc: { failedLoginCount: 1 } }, { new: true }).select('failedLoginCount lockedUntil');
  if (account?.failedLoginCount >= 10 && (!account.lockedUntil || account.lockedUntil <= now)) {
    const lockedUntil = new Date(now.getTime() + 15 * 60 * 1000);
    await Subscriber.updateOne({ _id: student._id }, { $set: { lockedUntil } });
    await AuditLog.create({ actorType: 'STUDENT', actorId: student._id, organizationId: student.organizationId, studentId: student._id, action: 'student.login.lockout', ip: ip || '' });
  }
}

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
    passwordChangeRequired: Boolean(student.mustChangePassword),
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

  async register(input, ip) {
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
    await AuditLog.create({ actorType: 'STUDENT', actorId: student._id, organizationId: student.organizationId, studentId: student._id, action: 'student.created', ip: ip || '' });
    return { id: String(student._id), fullName: student.fullName, email: student.email, organizationName: organization.name, status: student.registrationStatus };
  },

  async login(email, password, organizationId, ip) {
    const normalizedEmail = z.string().trim().email().max(255).parse(email).toLowerCase();
    if (await loginRateLimited(ip)) {
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
      throw Object.assign(new Error('Too many login failures. Try again in 15 minutes.'), { status: 429, code: 'LOGIN_RATE_LIMITED' });
    }
    const students = await Subscriber.find({ email: normalizedEmail }).select('+passwordHash');
    const matches = organizationId ? students.filter((student) => String(student.organizationId) === organizationId) : students;
    if (matches.length !== 1) {
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
      await noteFailedLogin(null, ip);
      await recordLoginFailure(ip);
      return null;
    }
    const student = matches[0];
    const passwordMatches = student.passwordHash
      ? await bcrypt.compare(password, student.passwordHash)
      : await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
    await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
    if (student.lockedUntil && student.lockedUntil > new Date()) return { locked: true };
    if (!passwordMatches) {
      await noteFailedLogin(student, ip);
      await recordLoginFailure(ip);
      return null;
    }
    const organization = await Organization.findOne({ _id: student.organizationId, status: 'ACTIVE' });
    if (!organization?.ownerId || !await BusinessOwner.exists({ _id: organization.ownerId, status: 'ACTIVE' })) return null;
    if (student.accessBlocked || !['ACTIVE', 'TRIALING'].includes(student.status) || student.registrationStatus !== 'APPROVED') return null;
    if (student.mustChangePassword && student.tempPasswordExpiresAt && student.tempPasswordExpiresAt <= new Date()) {
      student.inviteStatus = 'EXPIRED';
      await student.save();
      await clearLoginAttempts(ip);
      return { expired: true };
    }
    student.failedLoginCount = 0;
    student.lockedUntil = null;
    await student.save();
    await clearLoginAttempts(ip);
    return { student, organization, profile: safeStudent(student, organization) };
  },

  async issueSetPassword(student, { invalidatePassword = false, expiresInMs = 48 * 60 * 60 * 1000 } = {}) {
    const token = newToken();
    student.setPasswordTokenHash = hashToken(token);
    student.setPasswordTokenExpiresAt = new Date(Date.now() + expiresInMs);
    if (invalidatePassword) {
      student.passwordHash = null;
      student.passwordSetAt = null;
    }
    await student.save();
    await sendSetPasswordLink(student, token, expiresInMs);
  },

  async setPassword(token, password, ip) {
    const safePassword = changePasswordSchema.parse(password);
    const candidateHash = hashToken(token);
    const student = await Subscriber.findOne({ setPasswordTokenHash: candidateHash, setPasswordTokenExpiresAt: { $gt: new Date() } }).select('+passwordHash +setPasswordTokenHash');
    const tokenMatches = student?.setPasswordTokenHash
      && crypto.timingSafeEqual(Buffer.from(student.setPasswordTokenHash, 'hex'), Buffer.from(candidateHash, 'hex'));
    if (!student || !tokenMatches || student.registrationStatus !== 'APPROVED' || student.accessBlocked || student.status === 'INACTIVE') {
      throw Object.assign(new Error('This password link is invalid or expired'), { status: 400 });
    }
    const hadPassword = Boolean(student.passwordHash);
    if (commonPasswords.has(safePassword) || commonPasswords.has(safePassword.toLowerCase())) {
      throw Object.assign(new Error('Choose a less common password'), { status: 400, fieldErrors: { password: 'This password is too common' } });
    }
    if (safePassword.toLowerCase() === student.email.toLowerCase() || safePassword.toLowerCase() === student.fullName.trim().toLowerCase()) {
      throw Object.assign(new Error('Password cannot match your name or email'), { status: 400, fieldErrors: { password: 'Password cannot match your name or email' } });
    }
    if (student.passwordHash && await bcrypt.compare(safePassword, student.passwordHash)) {
      throw Object.assign(new Error('Choose a password you have not used before'), { status: 400, fieldErrors: { password: 'This password was used previously' } });
    }
    const organization = await Organization.findOne({ _id: student.organizationId, status: 'ACTIVE' });
    if (!organization?.ownerId || !await BusinessOwner.exists({ _id: organization.ownerId, status: 'ACTIVE' })) {
      throw Object.assign(new Error('This account is currently unavailable'), { status: 403 });
    }
    student.passwordHash = await bcrypt.hash(safePassword, 12);
    student.passwordSetAt = new Date();
    student.passwordChangedAt = new Date();
    student.mustChangePassword = false;
    student.tempPasswordExpiresAt = null;
    student.inviteStatus = 'ACTIVE';
    student.setPasswordTokenHash = null;
    student.setPasswordTokenExpiresAt = null;
    if (student.status === 'PENDING') student.status = 'ACTIVE';
    await student.save();
    await AuditLog.create({ actorType: 'STUDENT', actorId: student._id, organizationId: student.organizationId, studentId: student._id, action: 'student.password.changed', ip: ip || '' });
    let confirmationSent = true;
    if (hadPassword) {
      try { await sendPasswordChanged(student); } catch { confirmationSent = false; }
    }
    return { student, organization, confirmationSent };
  },

  async forgotPassword(email) {
    const normalizedEmail = z.string().trim().email().max(255).parse(email).toLowerCase();
    const student = await Subscriber.findOne({ email: normalizedEmail, status: { $in: ['ACTIVE', 'TRIALING'] }, registrationStatus: 'APPROVED' });
    if (student && !student.accessBlocked) await this.issueSetPassword(student, { expiresInMs: 30 * 60 * 1000 });
  },

  async changePassword(student, currentPassword, newPassword, confirmPassword, ip) {
    if (newPassword !== confirmPassword) throw Object.assign(new Error('New password and confirmation do not match'), { status: 400, fieldErrors: { confirmPassword: 'Passwords do not match' } });
    const safePassword = changePasswordSchema.parse(newPassword);
    const account = await Subscriber.findById(student._id).select('+passwordHash');
    if (!account?.passwordHash || !(await bcrypt.compare(currentPassword, account.passwordHash))) {
      throw Object.assign(new Error('Current password is incorrect'), { status: 401, fieldErrors: { currentPassword: 'Current password is incorrect' } });
    }
    if (account.mustChangePassword && account.tempPasswordExpiresAt && account.tempPasswordExpiresAt <= new Date()) {
      throw Object.assign(new Error('Your temporary password has expired. Ask your organisation to resend the invitation.'), { status: 401, code: 'TEMP_PASSWORD_EXPIRED' });
    }
    const normalized = safePassword.toLowerCase();
    if (await bcrypt.compare(safePassword, account.passwordHash)) {
      throw Object.assign(new Error('Choose a password you have not used before'), { status: 400, fieldErrors: { newPassword: 'New password must be different from your temporary password' } });
    }
    if (normalized === account.email.toLowerCase() || normalized === account.fullName.trim().toLowerCase()) {
      throw Object.assign(new Error('Password cannot match your name or email'), { status: 400, fieldErrors: { newPassword: 'Password cannot match your name or email' } });
    }
    if (commonPasswords.has(safePassword) || commonPasswords.has(normalized)) {
      throw Object.assign(new Error('Choose a less common password'), { status: 400, fieldErrors: { newPassword: 'This password is too common' } });
    }

    account.passwordHash = await bcrypt.hash(safePassword, 12);
    account.passwordSetAt = new Date();
    account.passwordChangedAt = new Date();
    account.mustChangePassword = false;
    account.tempPasswordExpiresAt = null;
    account.inviteStatus = 'ACTIVE';
    account.failedLoginCount = 0;
    account.lockedUntil = null;
    account.setPasswordTokenHash = null;
    account.setPasswordTokenExpiresAt = null;
    await account.save();
    await AuditLog.create({ actorType: 'STUDENT', actorId: account._id, organizationId: account.organizationId, studentId: account._id, action: 'student.password.changed', ip: ip || '' });
    let confirmationSent = true;
    try { await sendPasswordChanged(account); } catch { confirmationSent = false; }
    return { account, confirmationSent };
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
