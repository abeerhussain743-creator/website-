import mongoose from 'mongoose';

const packageSchema = new mongoose.Schema(
  {
    id: String,
    name: String,
    price: Number,
    description: String,
    recommended: { type: Boolean, default: false },
    features: [String],
  },
  { _id: false }
);

const scopeItemSchema = new mongoose.Schema(
  {
    order: Number,
    title: String,
    description: String,
  },
  { _id: false }
);

const timelineItemSchema = new mongoose.Schema(
  {
    week: String,
    title: String,
    description: String,
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        'created',
        'edited',
        'sent',
        'opened',
        'viewed_pricing',
        'requested_changes',
        'accepted',
        'declined',
        'follow_up_sent',
        'returned',
      ],
    },
    label: String,
    meta: mongoose.Schema.Types.Mixed,
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const proposalSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    call: { type: mongoose.Schema.Types.ObjectId, ref: 'Call', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    template: {
      type: String,
      enum: ['modern', 'corporate', 'creative', 'technical'],
      default: 'modern',
    },
    status: {
      type: String,
      enum: ['draft', 'ready', 'sent', 'viewed', 'changes_requested', 'accepted', 'declined'],
      default: 'draft',
      index: true,
    },
    content: {
      projectOverview: { type: String, default: '' },
      scopeOfWork: [scopeItemSchema],
      timeline: [timelineItemSchema],
      pricingNotes: { type: String, default: '' },
      nextSteps: { type: String, default: '' },
    },
    packages: [packageSchema],
    selectedPackageId: String,
    investment: { type: Number, default: 0 },
    timelineDisplay: String,
    publicToken: { type: String, required: true, unique: true },
    sentAt: Date,
    firstOpenedAt: Date,
    lastViewedAt: Date,
    acceptedAt: Date,
    totalViewTimeSeconds: { type: Number, default: 0 },
    openCount: { type: Number, default: 0 },
    changeRequest: String,
    events: [eventSchema],
    version: { type: Number, default: 1 },
  },
  { timestamps: true }
);

export default mongoose.model('Proposal', proposalSchema);
