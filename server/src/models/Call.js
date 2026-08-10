import mongoose from 'mongoose';

const requirementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
    confidence: { type: Number, min: 0, max: 100, default: 80 },
    inferred: { type: Boolean, default: false },
  },
  { _id: false }
);

const missingInfoSchema = new mongoose.Schema(
  {
    field: String,
    question: String,
    answered: { type: Boolean, default: false },
    answer: String,
  },
  { _id: false }
);

const analysisSchema = new mongoose.Schema(
  {
    summary: String,
    painPoints: [String],
    budget: {
      min: Number,
      max: Number,
      display: String,
      confidence: Number,
      inferred: { type: Boolean, default: false },
      note: String,
    },
    timeline: {
      display: String,
      weeksMin: Number,
      weeksMax: Number,
      confidence: Number,
      inferred: { type: Boolean, default: false },
    },
    decisionMaker: {
      name: String,
      title: String,
      confidence: Number,
    },
    urgency: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    requirements: [requirementSchema],
    missingInformation: [missingInfoSchema],
    processedAt: Date,
  },
  { _id: false }
);

const callSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    source: {
      type: String,
      enum: ['recording', 'transcript_file', 'paste', 'integration'],
      default: 'paste',
    },
    sourceLabel: String,
    fileName: String,
    transcript: { type: String, default: '' },
    status: {
      type: String,
      enum: [
        'uploaded',
        'processing',
        'analyzed',
        'proposal_ready',
        'awaiting_approval',
        'sent',
        'won',
        'lost',
      ],
      default: 'uploaded',
      index: true,
    },
    analysis: analysisSchema,
    proposal: { type: mongoose.Schema.Types.ObjectId, ref: 'Proposal' },
    durationSeconds: Number,
    callDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model('Call', callSchema);
