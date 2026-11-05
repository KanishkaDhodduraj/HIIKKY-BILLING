import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import BusinessOwner from '../../models/BusinessOwner.js';
import Organization from '../../models/Organization.js';
import OwnerSetting from '../../models/OwnerSetting.js';

export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const tokenValue = () => crypto.randomBytes(32).toString('base64url');

export const ownerAuthService = {
  async login(email, password) {
    const owner = await BusinessOwner.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!owner || owner.status !== 'ACTIVE' || !owner.passwordHash || !(await bcrypt.compare(password, owner.passwordHash))) return null;
    const organizations = await Organization.find({ ownerId: owner._id, status: 'ACTIVE' }).select('_id');
    if (!organizations.length) return null;
    const organizationIds = organizations.map((org) => String(org._id));
    const settings = await OwnerSetting.findOne({ organizationId: organizations[0]._id });
    return { owner, organizations: organizationIds, organizationId: String(organizations[0]._id), twoFactorEnabled: Boolean(settings?.security?.twoFactorEnabled), autoLogoutMinutes: settings?.security?.autoLogoutMinutes || 30 };
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
    await this.assertPasswordStrength(owner._id, password);
    owner.passwordHash = await bcrypt.hash(password, 12);
    owner.passwordSetAt = new Date();
    owner.setPasswordTokenHash = null;
    owner.setPasswordTokenExpiresAt = null;
    await owner.save();
    return owner;
  },
  async issueLoginCode(organizationId) {
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    await OwnerSetting.findOneAndUpdate({ organizationId }, { $set: { otpHash: hashToken(code), otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000), otpAttempts: 0 } }, { upsert: true, new: true, setDefaultsOnInsert: true });
    return code;
  },
  async verifyLoginCode(organizationId, code) {
    const setting = await OwnerSetting.findOne({ organizationId, otpHash: hashToken(code), otpExpiresAt: { $gt: new Date() }, otpAttempts: { $lt: 5 } }).select('+otpHash');
    if (!setting) throw Object.assign(new Error('Verification code is invalid or expired'), { status: 401 });
    setting.otpHash = null; setting.otpExpiresAt = null; setting.otpAttempts = 0; await setting.save();
  },
  async assertPasswordStrength(ownerId, password) {
    const organization = await Organization.findOne({ ownerId, status: 'ACTIVE' }).select('_id');
    const setting = organization ? await OwnerSetting.findOne({ organizationId: organization._id }) : null;
    if (setting?.security?.enforceStrongPassword && !(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/.test(password))) throw Object.assign(new Error('Password must include uppercase, lowercase, number, and symbol'), { status: 400, fieldErrors: { password: 'Use uppercase, lowercase, number, and symbol characters' } });
  },
  async safeProfile(ownerId) {
    const owner = await BusinessOwner.findById(ownerId);
    if (!owner || owner.status !== 'ACTIVE') throw Object.assign(new Error('Owner account is unavailable'), { status: 401 });
    return owner;
  },
};
