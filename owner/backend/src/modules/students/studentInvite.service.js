import crypto from 'node:crypto';
import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';
import Organization from '../../models/Organization.js';
import AuditLog from '../../models/AuditLog.js';
import { invalidateStudentSessionsById } from './studentSessions.js';

const tokenHash = (token) => crypto.createHash('sha256').update(token).digest('hex');
const html = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
let transport;

function mailTransport() {
  if (!env.smtpHost) return null;
  if (!transport) {
    transport = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPassword } : undefined,
    });
  }
  return transport;
}

function temporaryPassword() {
  const groups = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%&*?'];
  const characters = groups.map((group) => group[crypto.randomInt(group.length)]);
  const all = groups.join('');
  while (characters.length < 12) characters.push(all[crypto.randomInt(all.length)]);
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swap = crypto.randomInt(index + 1);
    [characters[index], characters[swap]] = [characters[swap], characters[index]];
  }
  return characters.join('');
}

async function deliver(message, { printInDevelopment = false } = {}) {
  const mailer = env.nodeEnv === 'test' || !env.smtpHost ? null : mailTransport();
  if (!mailer) {
    if (env.nodeEnv === 'production') throw new Error('Student email provider is not configured');
    const outbox = path.resolve(process.cwd(), env.ownerStudentOutboxPath);
    await mkdir(path.dirname(outbox), { recursive: true });
    await appendFile(outbox, `${JSON.stringify({ ...message, createdAt: new Date().toISOString() })}\n`, { encoding: 'utf8', mode: 0o600 });
    if (printInDevelopment) console.info(`Student invitation email:\n${message.text}`);
    return;
  }
  try {
    await mailer.sendMail({ from: env.mailFrom, ...message });
  } catch {
    throw new Error('Student email provider could not deliver the message');
  }
}

export async function issueTemporaryStudentInvite(student, { req, action = 'student.invite.sent' } = {}) {
  const organization = await Organization.findById(student.organizationId).select('name email');
  if (!organization) throw Object.assign(new Error('Student organization is unavailable'), { status: 404 });
  const now = new Date();
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const reservation = await student.constructor.collection.updateOne({
    _id: student._id,
    $expr: {
      $lt: [{
        $size: {
          $filter: {
            input: { $ifNull: ['$inviteSendHistory', []] },
            as: 'issued',
            cond: { $gt: ['$$issued', since] },
          },
        },
      }, 5],
    },
  }, [{
    $set: {
      inviteSendHistory: {
        $concatArrays: [
          { $filter: { input: { $ifNull: ['$inviteSendHistory', []] }, as: 'issued', cond: { $gt: ['$$issued', since] } } },
          [now],
        ],
      },
      inviteCount: { $add: [{ $ifNull: ['$inviteCount', 0] }, 1] },
    },
  }]);
  if (!reservation.matchedCount) throw Object.assign(new Error('Invitation limit reached. You can send up to 5 invitations in 24 hours.'), { status: 429 });
  const password = temporaryPassword();
  student.passwordHash = await bcrypt.hash(password, 12);
  student.passwordSetAt = null;
  student.mustChangePassword = true;
  student.tempPasswordIssuedAt = now;
  student.tempPasswordExpiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000);
  student.inviteStatus = 'INVITED';
  student.failedLoginCount = 0;
  student.lockedUntil = null;
  student.setPasswordTokenHash = null;
  student.setPasswordTokenExpiresAt = null;
  await student.save();
  const inviteCount = await student.constructor.findById(student._id).select('inviteCount');
  if (inviteCount) student.inviteCount = inviteCount.inviteCount;
  await invalidateStudentSessionsById(student._id);

  await AuditLog.create({
    actorType: 'OWNER',
    actorId: req?.owner?.id || null,
    organizationId: student.organizationId,
    studentId: student._id,
    action: 'student.invite.issued',
    ip: req?.ip || '',
  });
  if (action === 'student.password.reset_by_owner') {
    await AuditLog.create({
      actorType: 'OWNER', actorId: req?.owner?.id || null, organizationId: student.organizationId,
      studentId: student._id, action, ip: req?.ip || '',
    });
  }

  const expiry = student.tempPasswordExpiresAt.toLocaleString('en-US', { timeZone: 'UTC', timeZoneName: 'short' });
  const loginUrl = env.studentPortalUrl;
  const text = [
    `Hello ${student.fullName},`,
    '',
    `${organization.name} created your HIIKKY Student Portal account.`,
    `Login URL: ${loginUrl}`,
    `Registered email: ${student.email}`,
    `Temporary password: ${password}`,
    `This password expires within 72 hours, at: ${expiry}`,
    'You must change this password the first time you sign in.',
    '',
    `Did not expect this? Contact ${organization.email}.`,
  ].join('\n');
  const safeOrgName = html(organization.name);
  const safeStudentName = html(student.fullName);
  const safeLoginUrl = html(loginUrl);
  const safeEmail = html(student.email);
  const safePassword = html(password);
  const safeExpiry = html(expiry);
  const safeOrgEmail = html(organization.email);
  const message = {
    to: student.email,
    subject: `Your ${organization.name} student invitation`,
    text,
    html: `<!doctype html><html><body style="margin:0;background:#f4f6fb;font-family:Arial,sans-serif;color:#17223b"><main style="max-width:560px;margin:24px auto;padding:24px;background:#fff;border-radius:16px"><h1 style="font-size:22px">Welcome, ${safeStudentName}</h1><p>${safeOrgName} created your HIIKKY Student Portal account.</p><p><a href="${safeLoginUrl}" style="display:inline-block;padding:14px 20px;background:#5b3be5;color:#fff;text-decoration:none;border-radius:8px">Sign in to the Student Portal</a></p><p>Registered email: <strong>${safeEmail}</strong></p><p>Temporary password: <strong style="font-size:18px;letter-spacing:1px">${safePassword}</strong></p><p>This password expires within 72 hours, at ${safeExpiry}. You must set a new password the first time you sign in.</p><hr style="border:0;border-top:1px solid #e5e7eb"><p style="font-size:13px;color:#68738a">Did not expect this? Contact <a href="mailto:${safeOrgEmail}">${safeOrgEmail}</a>.</p></main></body></html>`,
  };

  try { await deliver(message, { printInDevelopment: true }); } catch {
    student.inviteStatus = 'INVITE_FAILED';
    await student.save();
    await AuditLog.create({
      actorType: 'OWNER',
      actorId: req?.owner?.id || null,
      organizationId: student.organizationId,
      studentId: student._id,
      action: 'student.invite.failed',
      ip: req?.ip || '',
    });
    return { sent: false };
  }
  student.inviteSentAt = new Date();
  student.inviteStatus = 'INVITED';
  await student.save();
  await AuditLog.create({
    actorType: 'OWNER',
    actorId: req?.owner?.id || null,
    organizationId: student.organizationId,
    studentId: student._id,
    action,
    ip: req?.ip || '',
  });
  return { sent: true };
}

export async function issueStudentInvite(student, { invalidatePassword = false } = {}) {
  const token = crypto.randomBytes(32).toString('base64url');
  student.setPasswordTokenHash = tokenHash(token);
  student.setPasswordTokenExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  if (invalidatePassword) {
    student.passwordHash = null;
    student.passwordSetAt = null;
  }
  await student.save();
  const baseUrl = process.env.STUDENT_PASSWORD_BASE_URL || 'http://localhost:5175/student/set-password';
  const link = `${baseUrl}?token=${encodeURIComponent(token)}`;
  await deliver({
    to: student.email,
    subject: 'Set your HIIKKY Student Portal password',
    text: `Hello ${student.fullName},\n\nSet your password using this one-time link (expires in 48 hours):\n${link}`,
    html: `<p>Hello ${html(student.fullName)},</p><p><a href="${html(link)}">Set your HIIKKY Student Portal password</a> (expires in 48 hours).</p>`,
  });
}
