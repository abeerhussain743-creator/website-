import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema(
  {
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    location: { type: String, default: 'Video call' },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'canceled'],
      default: 'scheduled',
    },
    meetingType: {
      type: String,
      enum: ['discovery', 'demo', 'negotiation', 'follow_up', 'internal'],
      default: 'discovery',
    },
  },
  { timestamps: true }
);

export default mongoose.model('Meeting', meetingSchema);
