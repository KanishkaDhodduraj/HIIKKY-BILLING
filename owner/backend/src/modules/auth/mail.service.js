import { env } from '../../config/env.js';

// Replace this adapter with SMTP delivery while keeping the invite call sites unchanged.
export const mailService = {
  async sendPasswordLink({ email, url, purpose }) {
    if (env.nodeEnv === 'development') console.info(`[owner-mail:${purpose}] to=${email} link=${url}`);
  },
};
