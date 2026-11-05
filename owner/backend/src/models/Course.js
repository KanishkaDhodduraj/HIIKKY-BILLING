import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  courseCode: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  courseName: { type: String, required: true, trim: true, maxlength: 200 },
  category: { type: String, default: '', maxlength: 100 }, instructorName: { type: String, default: '', maxlength: 150 },
  durationHours: { type: Number, min: 0, default: 0 }, price: { type: Number, min: 0, default: 0 },
  status: { type: String, enum: ['PUBLISHED', 'DRAFT', 'SCHEDULED', 'ARCHIVED'], default: 'DRAFT' },
}, { timestamps: true });
schema.index({ organizationId: 1, courseCode: 1 }, { unique: true });
schema.index({ organizationId: 1, status: 1, createdAt: -1 });
export default mongoose.model('Course', schema);
