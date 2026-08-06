import mongoose from 'mongoose';

const bankAccountSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    bankName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    currency: { type: String, default: 'USD' },
    openingBalance: { type: Number, default: 0 },
    glAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
  },
  { timestamps: true }
);

export default mongoose.model('BankAccount', bankAccountSchema);
