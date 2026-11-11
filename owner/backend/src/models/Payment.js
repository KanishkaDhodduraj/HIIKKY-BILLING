import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  subscriberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscriber', required: true, index: true },
  billingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Billing', required: true, unique: true },
  idempotencyKey: { type: String, required: true, maxlength: 128 },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true, default: 'USD', maxlength: 3 },
  provider: { type: String, enum: ['SANDBOX'], default: 'SANDBOX' },
  providerReference: { type: String, required: true, unique: true },
  paymentMethodType: { type: String, enum: ['CARD', 'UPI', 'BANK', 'NO_CHARGE'], default: 'CARD' },
  status: { type: String, enum: ['SUCCEEDED'], default: 'SUCCEEDED' },
  paidAt: { type: Date, required: true, default: Date.now },
}, { timestamps: true });
schema.index({ organizationId: 1, subscriberId: 1, idempotencyKey: 1 }, { unique: true });
schema.index({ organizationId: 1, subscriberId: 1, paidAt: -1 });
export default mongoose.model('Payment', schema);
