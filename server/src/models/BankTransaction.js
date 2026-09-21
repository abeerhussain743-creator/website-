import mongoose from 'mongoose';

const bankTransactionSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    bankAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount', required: true },
    date: { type: Date, required: true },
    description: { type: String, default: '' },
    amount: { type: Number, required: true },
    matched: { type: Boolean, default: false },
    journalEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry', default: null },
  },
  { timestamps: true }
);

export default mongoose.model('BankTransaction', bankTransactionSchema);
