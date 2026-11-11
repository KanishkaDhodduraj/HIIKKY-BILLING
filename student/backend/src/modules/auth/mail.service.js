import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';

let transport;
function getTransport() {
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

export async function sendSetPasswordLink(student, token) {
  const link = `${env.passwordBaseUrl}?token=${encodeURIComponent(token)}`;
  const mailTransport = getTransport();
  if (!mailTransport) {
    if (env.nodeEnv === 'production') throw new Error('SMTP_HOST is required to send student invitations in production');
    console.info(`Student set-password link for ${student.email}: ${link}`);
    return;
  }
  await mailTransport.sendMail({
    from: env.mailFrom,
    to: student.email,
    subject: 'Set your HIIKKY Student Portal password',
    text: `Hello ${student.fullName},\n\nSet your password using this one-time link (expires in 48 hours):\n${link}`,
  });
}
