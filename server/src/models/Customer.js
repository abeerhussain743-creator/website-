import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    shopifyCustomerId: { type: String, default: null },
    name: { type: String, required: true },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    country: { type: String, default: 'US' },
  },
  { timestamps: true }
);

customerSchema.index({ companyId: 1, shopifyCustomerId: 1 }, { sparse: true });

export default mongoose.model('Customer', customerSchema);
