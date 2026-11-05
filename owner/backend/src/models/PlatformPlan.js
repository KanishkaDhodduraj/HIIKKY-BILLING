import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  planName: { type: String, required: true, unique: true, trim: true, maxlength: 100 },
  description: { type: String, default: '', maxlength: 1000 },
  price: { type: Number, required: true, min: 0 },
  billingCycle: { type: String, required: true, enum: ['MONTHLY', 'YEARLY', 'ONE_TIME'] },
  maxUsers: { type: Number, min: 1, default: null },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
}, { timestamps: true });
export default mongoose.model('PlatformPlan', schema);
