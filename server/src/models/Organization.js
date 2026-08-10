import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    inviteCode: { type: String, required: true, unique: true },
    plan: { type: String, enum: ['free', 'pro', 'scale'], default: 'free' },
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    brand: {
      companyName: String,
      website: String,
      logoUrl: String,
      primaryColor: { type: String, default: '#0F766E' },
    },
    usage: {
      callsThisMonth: { type: Number, default: 0 },
      proposalsThisMonth: { type: Number, default: 0 },
      periodStart: { type: Date, default: Date.now },
    },
  },
  { timestamps: true }
);

export default mongoose.model('Organization', organizationSchema);
