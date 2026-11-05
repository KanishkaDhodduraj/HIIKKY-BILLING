import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import BusinessOwner from '../../models/BusinessOwner.js';
import Organization from '../../models/Organization.js';

export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const tokenValue = () => crypto.randomBytes(32).toString('base64url');

export const ownerAuthService = {
  async login(email, password) {
    const owner = await BusinessOwner.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!owner || owner.status !== 'ACTIVE' || !owner.passwordHash || !(await bcrypt.compare(password, owner.passwordHash))) return null;
    const organizations = await Organization.find({ ownerId: owner._id, status: 'ACTIVE' }).select('_id');
    return { owner, organizations: organizations.map((org) => String(org._id)) };
  },
  async issueSetPassword(owner, { invalidatePassword = false } = {}) {
    const token = tokenValue();
    owner.setPasswordTokenHash = hashToken(token);
    owner.setPasswordTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    if (invalidatePassword) { owner.passwordHash = null; owner.passwordSetAt = null; }
    await owner.save();
    return token;
  },
  async setPassword(token, password) {
    const owner = await BusinessOwner.findOne({ setPasswordTokenHash: hashToken(token), setPasswordTokenExpiresAt: { $gt: new Date() } }).select('+passwordHash +setPasswordTokenHash');
    if (!owner || owner.status !== 'ACTIVE') throw Object.assign(new Error('This password link is invalid or expired'), { status: 400 });
    owner.passwordHash = await bcrypt.hash(password, 12);
    owner.passwordSetAt = new Date();
    owner.setPasswordTokenHash = null;
    owner.setPasswordTokenExpiresAt = null;
    await owner.save();
    return owner;
  },
  async safeProfile(ownerId) {
    const owner = await BusinessOwner.findById(ownerId);
    if (!owner || owner.status !== 'ACTIVE') throw Object.assign(new Error('Owner account is unavailable'), { status: 401 });
    return owner;
  },
};
