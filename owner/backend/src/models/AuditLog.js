import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  actorType: { type: String, enum: ['OWNER', 'STUDENT', 'SYSTEM'], required: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, default: null },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscriber', default: null, index: true },
  action: { type: String, required: true, maxlength: 100 },
  ip: { type: String, default: '' },
}, { timestamps: { createdAt: true, updatedAt: false } });

schema.index({ studentId: 1, action: 1, createdAt: -1 });
export default mongoose.model('AuditLog', schema);
