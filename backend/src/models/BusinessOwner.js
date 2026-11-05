import mongoose from 'mongoose';
const schema = new mongoose.Schema({ firstName: { type: String, required: true, maxlength: 100 }, lastName: { type: String, default: '', maxlength: 100 }, email: { type: String, required: true, unique: true, lowercase: true, trim: true }, phone: { type: String, default: '' }, status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' } }, { timestamps: true });
export default mongoose.model('BusinessOwner', schema);
