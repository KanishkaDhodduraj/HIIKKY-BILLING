import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessOwner', default: null },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  industry: { type: String, default: '' },
  projectedStudentCount: { type: Number, min: 0, default: null },
  operatingRegion: { type: String, default: '' },
  subscriptionTier: { type: String, default: '' },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
}, { timestamps: true });

export default mongoose.model('Organization', schema);
