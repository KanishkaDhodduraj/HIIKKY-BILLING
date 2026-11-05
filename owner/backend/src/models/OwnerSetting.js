import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, unique: true },
  gateways: [{ provider: { type: String, enum: ['STRIPE', 'PAYPAL', 'RAZORPAY', 'CASHFREE'], required: true }, enabled: { type: Boolean, default: false }, publicKey: { type: String, default: '' }, apiKeyCiphertext: { type: String, select: false }, updatedAt: { type: Date, default: Date.now } }],
  emailSettings: { smtpHost: { type: String, default: '' }, port: { type: Number, default: 587 }, encryption: { type: String, enum: ['TLS', 'SSL', 'NONE'], default: 'TLS' }, username: { type: String, default: '' }, passwordCiphertext: { type: String, select: false }, fromName: { type: String, default: '' }, replyTo: { type: String, default: '' } },
  security: { twoFactorEnabled: { type: Boolean, default: false }, ipWhitelistEnabled: { type: Boolean, default: false }, allowedIPs: [{ type: String }], autoLogoutMinutes: { type: Number, min: 5, max: 480, default: 30 }, enforceStrongPassword: { type: Boolean, default: true }, masterApiKeyHash: { type: String, select: false }, masterApiKeyLast4: { type: String, default: '' }, masterApiKeyRotatedAt: { type: Date, default: null } },
  otpHash: { type: String, select: false, default: null }, otpExpiresAt: { type: Date, default: null }, otpAttempts: { type: Number, default: 0 },
}, { timestamps: true });
export default mongoose.model('OwnerSetting', schema);
