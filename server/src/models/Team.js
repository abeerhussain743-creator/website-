import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    plan: {
      type: String,
      enum: ['free', 'starter', 'growth', 'scale'],
      default: 'free',
    },
    stripeCustomerId: { type: String, default: '' },
    stripeSubscriptionId: { type: String, default: '' },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'trialing', 'past_due', 'canceled', 'incomplete', 'none'],
      default: 'none',
    },
    aiCreditsUsed: { type: Number, default: 0 },
    aiCreditsResetAt: { type: Date, default: () => new Date() },
    inviteCode: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model('Team', teamSchema);
