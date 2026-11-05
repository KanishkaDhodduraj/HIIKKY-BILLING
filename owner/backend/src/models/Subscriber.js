import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', default: null },
  fullName: { type: String, required: true, trim: true, maxlength: 150 },
  email: { type: String, required: true, lowercase: true, trim: true, maxlength: 255 },
  phone: { type: String, default: '', maxlength: 50 },
  startDate: { type: Date, default: Date.now }, endDate: { type: Date, default: null },
  status: { type: String, enum: ['ACTIVE', 'TRIALING', 'SUSPENDED', 'INACTIVE'], default: 'ACTIVE' },
  autoPayEnabled: { type: Boolean, default: false },
}, { timestamps: true });
schema.index({ organizationId: 1, email: 1 }, { unique: true });
schema.index({ organizationId: 1, status: 1, createdAt: -1 });
export default mongoose.model('Subscriber', schema);
