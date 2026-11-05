import mongoose from 'mongoose';
const schema = new mongoose.Schema({ key: { type: String, unique: true, required: true }, maxSubmissions: { type: Number, min: 1, max: 100, default: 10 }, updatedByAdminId: mongoose.Schema.Types.ObjectId }, { timestamps: true });
export default mongoose.model('AdminSetting', schema);
