import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';

const tokenHash = (token) => crypto.createHash('sha256').update(token).digest('hex');
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
  const mailer = mailTransport();
  if (!mailer) {
    if (env.nodeEnv === 'production') throw new Error('SMTP_HOST is required to send student invitations in production');
    console.info(`Student set-password link for ${student.email}: ${link}`);
    return;
  }
  await mailer.sendMail({
    from: env.mailFrom,
    to: student.email,
    subject: 'Set your HIIKKY Student Portal password',
    text: `Hello ${student.fullName},\n\nSet your password using this one-time link (expires in 48 hours):\n${link}`,
  });
}
