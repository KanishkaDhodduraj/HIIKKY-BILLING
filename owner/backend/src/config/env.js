import 'dotenv/config';

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5001),
  mongoUri: process.env.MONGODB_URI,
  sessionSecret: process.env.SESSION_SECRET,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5174',
  mailFrom: process.env.MAIL_FROM || 'onboarding@hiikky.local',
  passwordResetBaseUrl: process.env.PASSWORD_RESET_BASE_URL || 'http://localhost:5174/owner/set-password',
};

export function validateEnv() {
  if (!env.mongoUri) throw new Error('MONGODB_URI is required');
  if (!env.sessionSecret || env.sessionSecret.length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters');
}
