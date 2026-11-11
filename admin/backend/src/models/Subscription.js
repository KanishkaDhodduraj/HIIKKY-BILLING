import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  planName: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, default: '', maxlength: 1000 },
  price: { type: Number, required: true, min: 0 },
  billingCycle: { type: String, required: true, enum: ['MONTHLY', 'YEARLY', 'ONE_TIME'] },
  maxUsers: { type: Number, min: 1, default: null },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
}, { timestamps: true });
schema.index({ organizationId: 1, planName: 1 }, { unique: true });
schema.index({ organizationId: 1, status: 1 });
export default mongoose.model('Subscription', schema);
