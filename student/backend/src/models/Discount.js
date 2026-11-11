import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  code: { type: String, required: true, trim: true, uppercase: true, maxlength: 50 },
  discountName: { type: String, required: true, trim: true, maxlength: 150 },
  discountType: { type: String, required: true, enum: ['PERCENTAGE', 'FIXED'] },
  discountValue: { type: Number, required: true, min: 0 },
  maxUses: { type: Number, min: 1, default: null },
  usedCount: { type: Number, min: 0, default: 0 },
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  reason: { type: String, default: '', maxlength: 500 },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', default: null },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'EXPIRED', 'SCHEDULED'], default: 'ACTIVE' },
}, { timestamps: true });
schema.index({ organizationId: 1, code: 1 }, { unique: true });
schema.index({ organizationId: 1, status: 1, endDate: 1 });
export default mongoose.model('Discount', schema);
