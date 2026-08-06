import mongoose from 'mongoose';

export const ACCOUNT_TYPES = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];

const accountSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    accountNumber: { type: String, required: true },
    accountName: { type: String, required: true },
    accountType: { type: String, enum: ACCOUNT_TYPES, required: true },
    parentAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
    isActive: { type: Boolean, default: true },
    systemKey: { type: String, default: null }, // for automation lookups e.g. shopify_clearing
  },
  { timestamps: true }
);

accountSchema.index({ companyId: 1, accountNumber: 1 }, { unique: true });
accountSchema.index({ companyId: 1, systemKey: 1 }, { sparse: true });

export default mongoose.model('Account', accountSchema);
