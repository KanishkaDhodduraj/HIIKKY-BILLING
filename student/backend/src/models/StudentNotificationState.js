import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  subscriberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscriber', required: true, index: true },
  notificationId: { type: mongoose.Schema.Types.ObjectId, ref: 'BillingNotification', required: true },
  readAt: { type: Date, default: null },
  clearedAt: { type: Date, default: null },
}, { timestamps: true });
schema.index({ organizationId: 1, subscriberId: 1, notificationId: 1 }, { unique: true });
export default mongoose.model('StudentNotificationState', schema);
