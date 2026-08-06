import mongoose from 'mongoose';

const taxSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    country: { type: String, required: true },
    state: { type: String, default: '' },
    rate: { type: Number, required: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    name: { type: String, default: 'Sales Tax' },
  },
  { timestamps: true }
);

export default mongoose.model('Tax', taxSchema);
