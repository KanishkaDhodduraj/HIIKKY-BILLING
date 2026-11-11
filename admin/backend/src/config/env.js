import 'dotenv/config';
import path from 'node:path';
export const env = { port: Number(process.env.PORT || 5000), mongoUri: process.env.MONGODB_URI, sessionSecret: process.env.SESSION_SECRET, gatewayEncryptionKey: process.env.GATEWAY_ENCRYPTION_KEY, bootstrapSecret: process.env.ADMIN_BOOTSTRAP_SECRET, clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', ownerClientOrigin: process.env.OWNER_CLIENT_ORIGIN || 'http://localhost:5174', timezone: process.env.APP_TIMEZONE || 'UTC', nodeEnv: process.env.NODE_ENV || 'development', privateDocumentsDir: process.env.PRIVATE_DOCUMENTS_DIR || path.resolve(process.cwd(), 'private-documents'), smtpHost: process.env.SMTP_HOST, smtpPort: Number(process.env.SMTP_PORT || 587), smtpSecure: process.env.SMTP_SECURE === 'true', smtpUser: process.env.SMTP_USER, smtpPassword: process.env.SMTP_PASSWORD, mailFrom: process.env.MAIL_FROM || 'onboarding@hiikky.local' };
export function validateEnv() {
  if (!env.mongoUri) throw new Error('MONGODB_URI is required');
  if (!env.sessionSecret || env.sessionSecret.length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters');
  if (!env.gatewayEncryptionKey || env.gatewayEncryptionKey.length < 32) throw new Error('GATEWAY_ENCRYPTION_KEY must contain at least 32 characters');
}
