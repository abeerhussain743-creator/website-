import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    name: { type: String, required: true },
    email: { type: String, default: '' },
    paymentTerms: { type: String, default: 'Net 30' },
  },
  { timestamps: true }
);

export default mongoose.model('Vendor', vendorSchema);
