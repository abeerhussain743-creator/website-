import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    companyName: { type: String, required: true, trim: true },
    contactName: { type: String, trim: true },
    contactEmail: { type: String, trim: true, lowercase: true },
    contactTitle: { type: String, trim: true },
    industry: String,
    website: String,
    notes: String,
    status: {
      type: String,
      enum: ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'],
      default: 'lead',
    },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('Client', clientSchema);
