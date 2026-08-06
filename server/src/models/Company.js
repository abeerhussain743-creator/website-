import mongoose from 'mongoose';

const companySchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true },
    currency: { type: String, default: 'USD' },
    country: { type: String, default: 'US' },
    fiscalYearStart: { type: Number, default: 1 }, // month 1-12
    timezone: { type: String, default: 'America/New_York' },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export default mongoose.model('Company', companySchema);
