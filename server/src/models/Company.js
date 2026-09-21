import mongoose from 'mongoose';

const companySchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, trim: true },
    currency: { type: String, default: 'USD' },
    country: { type: String, default: 'US' },
    fiscalYearStart: { type: Number, default: 1 }, // month 1-12
    timezone: { type: String, default: 'America/New_York' },
    plan: { type: String, enum: ['starter', 'growth', 'scale'], default: 'starter' },
    shopify: {
      shopDomain: { type: String, default: null },
      accessToken: { type: String, default: null, select: false },
      scope: { type: String, default: null },
      installedAt: { type: Date, default: null },
      lastSyncAt: { type: Date, default: null },
      webhookSecret: { type: String, default: null, select: false },
      status: {
        type: String,
        enum: ['disconnected', 'connected', 'error'],
        default: 'disconnected',
      },
    },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export default mongoose.model('Company', companySchema);
