import 'dotenv/config';

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5001),
  mongoUri: process.env.MONGODB_URI,
  sessionSecret: process.env.SESSION_SECRET,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5174',
  mailFrom: process.env.MAIL_FROM || 'onboarding@hiikky.local',
  smtpHost: process.env.SMTP_HOST,
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER,
  smtpPassword: process.env.SMTP_PASSWORD,
  passwordResetBaseUrl: process.env.PASSWORD_RESET_BASE_URL || 'http://localhost:5174/owner/set-password',
  timezone: process.env.APP_TIMEZONE || 'Asia/Calcutta',
  settingsEncryptionKey: process.env.SETTINGS_ENCRYPTION_KEY,
};

export function validateEnv() {
  if (!env.mongoUri) throw new Error('MONGODB_URI is required');
  if (!env.sessionSecret || env.sessionSecret.length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters');
  if (!env.settingsEncryptionKey || env.settingsEncryptionKey.length < 32) throw new Error('SETTINGS_ENCRYPTION_KEY must contain at least 32 characters');
}
