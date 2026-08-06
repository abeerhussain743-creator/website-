import mongoose from 'mongoose';

const inventoryTransactionSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    type: { type: String, enum: ['Purchase', 'Sale', 'Adjustment', 'Return'], required: true },
    quantity: { type: Number, required: true },
    unitCost: { type: Number, default: 0 },
    date: { type: Date, required: true },
    reference: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('InventoryTransaction', inventoryTransactionSchema);
