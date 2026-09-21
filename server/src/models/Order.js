import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    shopifyOrderId: { type: String, default: null },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
    orderNumber: { type: String, required: true },
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    costOfGoods: { type: Number, default: 0 },
    shopifyFee: { type: Number, default: 0 },
    financialStatus: {
      type: String,
      enum: ['pending', 'paid', 'partially_refunded', 'refunded', 'voided'],
      default: 'paid',
    },
    fulfillmentStatus: {
      type: String,
      enum: ['unfulfilled', 'partial', 'fulfilled', 'restocked'],
      default: 'fulfilled',
    },
    journalEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry', default: null },
    lineItems: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        title: String,
        quantity: Number,
        unitPrice: Number,
        unitCost: Number,
      },
    ],
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

orderSchema.index({ companyId: 1, shopifyOrderId: 1 }, { sparse: true });
orderSchema.index({ companyId: 1, orderNumber: 1 }, { unique: true });

export default mongoose.model('Order', orderSchema);
