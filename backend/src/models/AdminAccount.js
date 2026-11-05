import mongoose from 'mongoose';
const schema = new mongoose.Schema({ email: { type: String, required: true, unique: true, lowercase: true, trim: true }, passwordHash: { type: String, required: true, select: false }, role: { type: String, enum: ['ADMIN', 'SUPER_ADMIN'], required: true }, enabled: { type: Boolean, default: true } }, { timestamps: true });
export default mongoose.model('AdminAccount', schema);
