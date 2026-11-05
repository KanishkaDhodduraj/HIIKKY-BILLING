import crypto from 'node:crypto';
import { z } from 'zod';
import Organization from '../../models/Organization.js';
import OwnerSetting from '../../models/OwnerSetting.js';
import { primaryOrganizationId } from '../shared/ownerRepository.js';
import { encryptSecret } from './secretCipher.js';
import { settingsRepository } from './settings.repository.js';

const profileFields = ['name', 'email', 'phone', 'address', 'industry', 'projectedStudentCount', 'operatingRegion'];
const providerMethods = { STRIPE: ['Cards', 'Apple Pay', 'Google Pay'], PAYPAL: ['Wallet', 'Venmo', 'Credit'], RAZORPAY: ['UPI', 'NetBanking', 'Cards'], CASHFREE: ['Cards', 'UPI', 'NetBanking'] };
const safeSetting = (setting) => ({
  gateways: Object.keys(providerMethods).map((provider) => { const entry = setting?.gateways?.find((gateway) => gateway.provider === provider); const hasCredentials = Boolean(entry?.apiKeyCiphertext); return { provider, enabled: Boolean(entry?.enabled), hasCredentials, publicKey: entry?.publicKey || '', supportedMethods: providerMethods[provider], status: entry?.enabled && hasCredentials ? 'CONFIGURED' : entry?.enabled ? 'NEEDS_CREDENTIALS' : entry ? 'DISABLED' : 'NOT_CONFIGURED' }; }),
  emailSettings: { smtpHost: setting?.emailSettings?.smtpHost || '', port: setting?.emailSettings?.port || 587, encryption: setting?.emailSettings?.encryption || 'TLS', username: setting?.emailSettings?.username || '', hasPassword: Boolean(setting?.emailSettings?.passwordCiphertext), fromName: setting?.emailSettings?.fromName || '', replyTo: setting?.emailSettings?.replyTo || '' },
  security: { twoFactorEnabled: Boolean(setting?.security?.twoFactorEnabled), ipWhitelistEnabled: Boolean(setting?.security?.ipWhitelistEnabled), allowedIPs: setting?.security?.allowedIPs || [], autoLogoutMinutes: setting?.security?.autoLogoutMinutes || 30, enforceStrongPassword: setting?.security?.enforceStrongPassword !== false, masterApiKeyLast4: setting?.security?.masterApiKeyLast4 || '', masterApiKeyRotatedAt: setting?.security?.masterApiKeyRotatedAt || null },
});

export const settingsService = {
  async get(req) {
    const [organization, setting] = await Promise.all([settingsRepository.getOrganization(req), settingsRepository.find(req, true)]);
    if (!organization) throw Object.assign(new Error('Organization not found'), { status: 404 });
    return { organization: { id: String(organization._id), name: organization.name, email: organization.email, phone: organization.phone, address: organization.address, industry: organization.industry, projectedStudentCount: organization.projectedStudentCount, operatingRegion: organization.operatingRegion, subscriptionTier: organization.subscriptionTier }, settings: safeSetting(setting) };
  },
  async updateProfile(req, input) {
    const values = Object.fromEntries(profileFields.filter((field) => input[field] !== undefined).map((field) => [field, input[field]]));
    if (values.email) values.email = values.email.toLowerCase();
    const org = await Organization.findOneAndUpdate({ _id: primaryOrganizationId(req), ownerId: req.owner.id }, { $set: values }, { new: true, runValidators: true });
    if (!org) throw Object.assign(new Error('Organization not found'), { status: 404 });
    return { id: String(org._id), name: org.name, email: org.email, phone: org.phone, address: org.address, industry: org.industry, projectedStudentCount: org.projectedStudentCount, operatingRegion: org.operatingRegion, subscriptionTier: org.subscriptionTier };
  },
  async updateGateway(req, provider, input) {
    if (!providerMethods[provider]) throw Object.assign(new Error('Unsupported payment provider'), { status: 400 });
    const id = primaryOrganizationId(req);
    const setting = await OwnerSetting.findOne({ organizationId: id }).select('+gateways.apiKeyCiphertext') || new OwnerSetting({ organizationId: id });
    let gateway = setting.gateways.find((entry) => entry.provider === provider);
    if (!gateway) { setting.gateways.push({ provider }); gateway = setting.gateways[setting.gateways.length - 1]; }
    if (input.enabled !== undefined) gateway.enabled = input.enabled;
    if (input.publicKey !== undefined) gateway.publicKey = input.publicKey;
    if (input.apiKey) gateway.apiKeyCiphertext = encryptSecret(input.apiKey);
    gateway.updatedAt = new Date();
    await setting.save();
    return safeSetting(setting).gateways.find((entry) => entry.provider === provider);
  },
  async updateEmail(req, input) {
    const setting = await settingsRepository.find(req, true) || new OwnerSetting({ organizationId: primaryOrganizationId(req) });
    for (const key of ['smtpHost', 'port', 'encryption', 'username', 'fromName', 'replyTo']) if (input[key] !== undefined) setting.emailSettings[key] = input[key];
    if (input.password) setting.emailSettings.passwordCiphertext = encryptSecret(input.password);
    await setting.save();
    return safeSetting(setting).emailSettings;
  },
  async updateSecurity(req, input) {
    const current = await settingsRepository.find(req) || new OwnerSetting({ organizationId: primaryOrganizationId(req) });
    const values = { ...current.security, ...input };
    if (values.ipWhitelistEnabled && (!values.allowedIPs?.length || !values.allowedIPs.includes(req.ip))) throw Object.assign(new Error('Add this browser IP to the allow list before enabling IP restrictions'), { status: 400, fieldErrors: { allowedIPs: 'The current IP must be included' } });
    current.security = values;
    await current.save();
    return safeSetting(current).security;
  },
  async rotateApiKey(req) {
    const setting = await settingsRepository.find(req, true) || new OwnerSetting({ organizationId: primaryOrganizationId(req) });
    const key = `hk_live_${crypto.randomBytes(32).toString('base64url')}`;
    setting.security.masterApiKeyHash = crypto.createHash('sha256').update(key).digest('hex');
    setting.security.masterApiKeyLast4 = key.slice(-4);
    setting.security.masterApiKeyRotatedAt = new Date();
    await setting.save();
    return { apiKey: key, last4: setting.security.masterApiKeyLast4, rotatedAt: setting.security.masterApiKeyRotatedAt };
  },
  async gatewayTest(req, provider) {
    const result = safeSetting(await OwnerSetting.findOne({ organizationId: primaryOrganizationId(req) }).select('+gateways.apiKeyCiphertext'));
    const gateway = result.gateways.find((entry) => entry.provider === provider);
    if (!gateway) throw Object.assign(new Error('Configure this provider before checking its settings'), { status: 400 });
    return { provider, verified: false, message: 'Provider payment processing is not integrated; the saved configuration has not been verified.' };
  },
  safe: safeSetting,
};
