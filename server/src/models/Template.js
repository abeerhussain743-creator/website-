import mongoose from 'mongoose';

const templateSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
    key: { type: String, required: true },
    name: { type: String, required: true },
    description: String,
    style: {
      type: String,
      enum: ['modern', 'corporate', 'creative', 'technical'],
      required: true,
    },
    isSystem: { type: Boolean, default: false },
    previewAccent: String,
  },
  { timestamps: true }
);

export default mongoose.model('Template', templateSchema);
