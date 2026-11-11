import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  subscriberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscriber', required: true, index: true },
  type: { type: String, enum: ['CARD', 'UPI', 'BANK'], required: true },
  label: { type: String, required: true, trim: true, maxlength: 80 },
  tokenReference: { type: String, required: true, select: false },
  brand: { type: String, default: '', maxlength: 30 },
  lastFour: { type: String, default: '', match: /^\d{0,4}$/ },
  expiryMonth: { type: Number, min: 1, max: 12, default: null },
  expiryYear: { type: Number, min: 2020, max: 2200, default: null },
  isDefault: { type: Boolean, default: false },
}, { timestamps: true });
schema.index({ organizationId: 1, subscriberId: 1, createdAt: -1 });
export default mongoose.model('StudentPaymentMethod', schema);
