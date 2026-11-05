import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { env } from '../../config/env.js';
import { ownerMailService } from './mail.service.js';

export function createInviteCredential() {
  const token = crypto.randomBytes(32).toString('base64url');
  return { token, tokenHash: crypto.createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) };
}

export async function sendOwnerInvite(owner, token, purpose = 'invite') {
  const url = `${env.ownerClientOrigin}/owner/set-password?token=${encodeURIComponent(token)}`;
  await ownerMailService.sendPasswordLink({ email: owner.email, url, purpose });
}

export const ownerInviteService = {
  async issue(owner, { reset = false } = {}) {
    const credential = createInviteCredential();
    owner.setPasswordTokenHash = credential.tokenHash;
    owner.setPasswordTokenExpiresAt = credential.expiresAt;
    if (reset) { owner.passwordHash = null; owner.passwordSetAt = null; }
    await owner.save();
    await sendOwnerInvite(owner, credential.token, reset ? 'reset' : 'invite');
    return owner;
  },
  async invalidateSessions(ownerId) {
    const id = String(ownerId);
    const sessionCollection = mongoose.connection.collection('owner_sessions');
    // connect-mongo serializes its session payload as JSON in the `session` field.
    return sessionCollection.deleteMany({ session: { $regex: `"owner":\\{"id":"${id}"` } });
  },
};

export function invitationStatus(owner) {
  return owner.passwordSetAt ? 'active' : 'invited';
}
