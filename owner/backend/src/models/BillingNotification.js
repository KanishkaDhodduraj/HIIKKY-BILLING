import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  billingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Billing', default: null, index: true },
  recipientEmail: { type: String, required: true, lowercase: true, trim: true, maxlength: 255 },
  subject: { type: String, required: true, trim: true, maxlength: 200 }, message: { type: String, required: true, maxlength: 5000 },
  status: { type: String, enum: ['QUEUED', 'SENT', 'FAILED'], default: 'QUEUED' }, sentAt: { type: Date, default: null },
}, { timestamps: true });
schema.index({ organizationId: 1, status: 1, createdAt: -1 });
export default mongoose.model('BillingNotification', schema);
