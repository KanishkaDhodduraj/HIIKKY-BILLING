import mongoose from 'mongoose';
const schema = new mongoose.Schema({ notificationType: String, recipientType: String, subject: String, message: String, status: { type: String, default: 'DISPATCHED' } }, { timestamps: true });
export default mongoose.model('Notification', schema);
