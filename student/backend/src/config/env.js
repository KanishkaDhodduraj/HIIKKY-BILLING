import 'dotenv/config';

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5002),
  mongoUri: process.env.MONGODB_URI,
  sessionSecret: process.env.SESSION_SECRET,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5175',
  mailFrom: process.env.MAIL_FROM || 'no-reply@hiikky.local',
  smtpHost: process.env.SMTP_HOST,
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER,
  smtpPassword: process.env.SMTP_PASSWORD,
  passwordBaseUrl: process.env.STUDENT_PASSWORD_BASE_URL || 'http://localhost:5175/student/set-password',
  studentPortalUrl: process.env.STUDENT_PORTAL_URL || 'http://localhost:5175/student/login',
  studentDevOutboxPath: process.env.STUDENT_DEV_OUTBOX || '.dev-outbox.jsonl',
  paymentMode: process.env.PAYMENT_MODE || 'sandbox',
};

export function validateEnv() {
  if (!env.mongoUri) throw new Error('MONGODB_URI is required');
  if (!env.sessionSecret || env.sessionSecret.length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters');
  if (env.paymentMode !== 'sandbox') throw new Error('Only PAYMENT_MODE=sandbox is supported');
}
