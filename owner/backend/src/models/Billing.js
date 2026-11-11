import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  subscriberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscriber', default: null, index: true },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', default: null },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
  invoiceNumber: { type: String, required: true, trim: true },
  paymentName: { type: String, required: true, trim: true, maxlength: 200 },
  dueDate: { type: Date, required: true }, paidDate: { type: Date, default: null },
  amount: { type: Number, required: true, min: 0 }, originalAmount: { type: Number, min: 0, default: null }, discountAmount: { type: Number, min: 0, default: 0 },
  paymentStatus: { type: String, enum: ['PAID', 'UNPAID', 'OVERDUE'], default: 'UNPAID' }, paymentMethod: { type: String, default: '' },
  applyPlanAfterPayment: { type: Boolean, default: false },
}, { timestamps: true });
schema.index({ organizationId: 1, invoiceNumber: 1 }, { unique: true });
schema.index({ organizationId: 1, paymentStatus: 1, dueDate: 1 });
schema.index({ organizationId: 1, createdAt: -1 });
export default mongoose.model('Billing', schema);
