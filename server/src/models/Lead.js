import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['note', 'email', 'call', 'meeting', 'status_change', 'ai'],
      required: true,
    },
    content: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const leadSchema = new mongoose.Schema(
  {
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true, default: '' },
    company: { type: String, trim: true, default: '' },
    title: { type: String, trim: true, default: '' },
    source: {
      type: String,
      enum: ['website', 'referral', 'cold_outreach', 'linkedin', 'event', 'inbound', 'other'],
      default: 'other',
    },
    stage: {
      type: String,
      enum: ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'],
      default: 'new',
      index: true,
    },
    value: { type: Number, default: 0 },
    probability: { type: Number, default: 10, min: 0, max: 100 },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    tags: [{ type: String }],
    notes: { type: String, default: '' },
    lastContactedAt: { type: Date },
    nextFollowUpAt: { type: Date },
    activities: [activitySchema],
  },
  { timestamps: true }
);

leadSchema.index({ team: 1, stage: 1 });
leadSchema.index({ team: 1, owner: 1 });

export default mongoose.model('Lead', leadSchema);
