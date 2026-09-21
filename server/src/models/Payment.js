import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    gateway: { type: String, default: 'shopify_payments' },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    transactionId: { type: String, default: '' },
    paymentDate: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'success', 'failed', 'refunded'], default: 'success' },
  },
  { timestamps: true }
);

export default mongoose.model('Payment', paymentSchema);
