import mongoose from 'mongoose';

// Keep shared owner identity, credentials, and status fields aligned with admin/backend.
const schema = new mongoose.Schema({
  firstName: { type: String, required: true, maxlength: 100 },
  lastName: { type: String, default: '', maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, default: '' },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  passwordHash: { type: String, select: false, default: null },
  passwordSetAt: { type: Date, default: null },
  setPasswordTokenHash: { type: String, select: false, default: null },
  setPasswordTokenExpiresAt: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.model('BusinessOwner', schema);
