import mongoose from 'mongoose';

const journalLineSchema = new mongoose.Schema(
  {
    journalEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JournalEntry',
      required: true,
      index: true,
    },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    debit: { type: Number, default: 0, min: 0 },
    credit: { type: Number, default: 0, min: 0 },
    memo: { type: String, default: '' },
  },
  { timestamps: true }
);

journalLineSchema.pre('validate', function validateDebitCredit(next) {
  const hasDebit = this.debit > 0;
  const hasCredit = this.credit > 0;
  if (hasDebit === hasCredit) {
    return next(new Error('Each journal line must have either a debit or a credit, not both or neither'));
  }
  next();
});

export default mongoose.model('JournalLine', journalLineSchema);
