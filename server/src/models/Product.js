import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    shopifyProductId: { type: String, default: null },
    sku: { type: String, required: true },
    title: { type: String, required: true },
    cost: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    inventoryAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
    incomeAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
    expenseAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
  },
  { timestamps: true }
);

productSchema.index({ companyId: 1, sku: 1 }, { unique: true });

export default mongoose.model('Product', productSchema);
