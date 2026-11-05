import crypto from 'node:crypto';
import { env } from '../../config/env.js';

function encryptionKey() {
  const source = env.settingsEncryptionKey || (env.nodeEnv === 'development' ? 'development-key-replace-before-use' : '');
  if (source.length < 32) throw Object.assign(new Error('SETTINGS_ENCRYPTION_KEY must contain at least 32 characters'), { status: 500 });
  return crypto.createHash('sha256').update(source).digest();
}
export function encryptSecret(value) {
  if (!value) return null;
  const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
}
export function decryptSecret(payload) {
  if (!payload) return '';
  const [iv, tag, data] = payload.split('.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
}
