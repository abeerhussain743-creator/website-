import mongoose from 'mongoose';

const journalEntrySchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    date: { type: Date, required: true },
    reference: { type: String, default: '' },
    description: { type: String, default: '' },
    status: { type: String, enum: ['draft', 'posted', 'void'], default: 'posted' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    sourceType: {
      type: String,
      enum: ['manual', 'order', 'refund', 'payout', 'expense', 'inventory', 'fee', 'adjustment'],
      default: 'manual',
    },
    sourceId: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export default mongoose.model('JournalEntry', journalEntrySchema);
