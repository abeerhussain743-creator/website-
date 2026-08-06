import mongoose from 'mongoose';

const payoutSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    shopifyPayoutId: { type: String, default: null },
    bankAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount', default: null },
    grossSales: { type: Number, default: 0 },
    refunds: { type: Number, default: 0 },
    fees: { type: Number, default: 0 },
    netAmount: { type: Number, required: true },
    depositDate: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'in_transit', 'paid', 'failed'], default: 'paid' },
    journalEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry', default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Payout', payoutSchema);
