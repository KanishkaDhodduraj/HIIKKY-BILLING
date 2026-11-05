import { env } from '../../config/env.js';

// Replace this adapter with SMTP delivery while keeping the invite call sites unchanged.
export const mailService = {
  async sendPasswordLink({ email, url, purpose }) {
    if (env.nodeEnv === 'development') console.info(`[owner-mail:${purpose}] to=${email} link=${url}`);
  },
  async sendLoginCode({ email, code }) {
    if (env.nodeEnv === 'development') console.info(`[owner-mail:two-factor] to=${email} code=${code}`);
  },
  async sendTestEmail({ to, host }) {
    if (env.nodeEnv === 'development') console.info(`[owner-mail:test] to=${to || 'not-set'} host=${host}`);
    return { sent: false, mode: 'stub', message: 'SMTP settings were checked, but email delivery is not connected yet.' };
  },
};
