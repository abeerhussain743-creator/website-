import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    expenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense', default: null },
    journalEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry', default: null },
    fileUrl: { type: String, required: true },
    fileName: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('Attachment', attachmentSchema);
