import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, default: 0 },
    averageCost: { type: Number, default: 0 },
    warehouse: { type: String, default: 'Main' },
  },
  { timestamps: true }
);

inventorySchema.index({ companyId: 1, productId: 1, warehouse: 1 }, { unique: true });

export default mongoose.model('Inventory', inventorySchema);
