import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  subscriberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscriber', required: true, index: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  status: { type: String, enum: ['ACTIVE', 'COMPLETED'], default: 'ACTIVE' },
  progressPercent: { type: Number, min: 0, max: 100, default: 0 },
  lastAccessedAt: { type: Date, default: null },
  assignedAt: { type: Date, default: Date.now },
}, { timestamps: true });
schema.index({ organizationId: 1, subscriberId: 1, courseId: 1 }, { unique: true });
export default mongoose.model('StudentCourse', schema);
