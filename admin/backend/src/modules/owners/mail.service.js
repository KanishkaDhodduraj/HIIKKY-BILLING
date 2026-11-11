import { env } from '../../config/env.js';
import nodemailer from 'nodemailer';

const transporter = env.smtpHost ? nodemailer.createTransport({
  host: env.smtpHost,
  port: env.smtpPort,
  secure: env.smtpSecure,
  ...(env.smtpUser ? { auth: { user: env.smtpUser, pass: env.smtpPassword } } : {}),
}) : null;

export const ownerMailService = {
  async sendPasswordLink({ email, url, purpose }) {
    if (transporter) await transporter.sendMail({ from: env.mailFrom, to: email, subject: purpose === 'reset' ? 'Reset your HIIKKY password' : 'Set your HIIKKY password', text: `Use this one-time link within 48 hours: ${url}` });
    if (env.nodeEnv === 'development') console.info(`[owner-mail:${purpose}] to=${email} link=${url}`);
    else if (!transporter) throw new Error('SMTP is not configured');
  },
};
