import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', default: null },
  fullName: { type: String, required: true, trim: true, maxlength: 150 },
  email: { type: String, required: true, lowercase: true, trim: true, maxlength: 255 },
  phone: { type: String, default: '', maxlength: 50 },
  startDate: { type: Date, default: Date.now }, endDate: { type: Date, default: null },
  status: { type: String, enum: ['PENDING', 'ACTIVE', 'TRIALING', 'SUSPENDED', 'INACTIVE'], default: 'ACTIVE' },
  registrationStatus: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'APPROVED' },
  registrationReviewReason: { type: String, default: '', maxlength: 1000 },
  accessBlocked: { type: Boolean, default: false },
  accessBlockedReason: { type: String, default: '', maxlength: 500 },
  accessBlockedAt: { type: Date, default: null },
  autoPayEnabled: { type: Boolean, default: false },
  emailNotificationsEnabled: { type: Boolean, default: true },
  avatarData: { type: String, default: '', maxlength: 1400000 },
  passwordHash: { type: String, select: false, default: null },
  passwordSetAt: { type: Date, default: null },
  mustChangePassword: { type: Boolean, default: false },
  tempPasswordExpiresAt: { type: Date, default: null },
  tempPasswordIssuedAt: { type: Date, default: null },
  passwordChangedAt: { type: Date, default: null },
  inviteStatus: { type: String, enum: ['INVITED', 'ACTIVE', 'INVITE_FAILED', 'EXPIRED', null], default: null },
  inviteSentAt: { type: Date, default: null },
  inviteCount: { type: Number, default: 0 },
  inviteSendHistory: { type: [Date], default: [], select: false },
  failedLoginCount: { type: Number, default: 0 },
  lockedUntil: { type: Date, default: null },
  setPasswordTokenHash: { type: String, select: false, default: null },
  setPasswordTokenExpiresAt: { type: Date, default: null },
}, { timestamps: true });
schema.index({ email: 1 }, { unique: true });
schema.index({ organizationId: 1, status: 1, createdAt: -1 });
export default mongoose.model('Subscriber', schema);
