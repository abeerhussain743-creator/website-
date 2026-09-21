import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', default: null },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    amount: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    date: { type: Date, required: true },
    paymentMethod: { type: String, default: 'bank' },
    receipt: { type: String, default: '' },
    notes: { type: String, default: '' },
    journalEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry', default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Expense', expenseSchema);
