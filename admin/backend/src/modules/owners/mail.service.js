import { env } from '../../config/env.js';

// SMTP can replace this adapter without changing owner invitation workflows.
export const ownerMailService = {
  async sendPasswordLink({ email, url, purpose }) {
    if (env.nodeEnv === 'development') console.info(`[owner-mail:${purpose}] to=${email} link=${url}`);
  },
};
