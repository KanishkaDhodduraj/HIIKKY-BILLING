import { env } from '../../config/env.js';
import nodemailer from 'nodemailer';

const transporter = env.smtpHost ? nodemailer.createTransport({
  host: env.smtpHost,
  port: env.smtpPort,
  secure: env.smtpSecure,
  ...(env.smtpUser ? { auth: { user: env.smtpUser, pass: env.smtpPassword } } : {}),
}) : null;

export const mailService = {
  async sendPasswordLink({ email, url, purpose }) {
    if (transporter) await transporter.sendMail({ from: env.mailFrom, to: email, subject: purpose === 'reset' ? 'Reset your HIIKKY password' : 'Set your HIIKKY password', text: `Use this one-time link: ${url}` });
    if (env.nodeEnv === 'development') console.info(`[owner-mail:${purpose}] to=${email} link=${url}`);
    else if (!transporter) throw new Error('SMTP is not configured');
  },
  async sendLoginCode({ email, code }) {
    if (transporter) await transporter.sendMail({ from: env.mailFrom, to: email, subject: 'Your HIIKKY verification code', text: `Your verification code is ${code}.` });
    if (env.nodeEnv === 'development') console.info(`[owner-mail:two-factor] to=${email} code=${code}`);
    else if (!transporter) throw new Error('SMTP is not configured');
  },
  async sendTestEmail({ to, host }) {
    if (env.nodeEnv === 'development') console.info(`[owner-mail:test] to=${to || 'not-set'} host=${host}`);
    return { sent: false, mode: 'stub', message: 'SMTP settings were checked, but email delivery is not connected yet.' };
  },
};
