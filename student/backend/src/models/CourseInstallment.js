import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  installmentNumber: { type: Number, required: true, min: 1 },
  installmentName: { type: String, required: true, trim: true, maxlength: 100 },
  amount: { type: Number, required: true, min: 0 },
  dueDays: { type: Number, min: 0, default: 0 },
  dueDate: { type: Date, default: null },
}, { timestamps: true });
schema.index({ organizationId: 1, courseId: 1, installmentNumber: 1 }, { unique: true });
export default mongoose.model('CourseInstallment', schema);
