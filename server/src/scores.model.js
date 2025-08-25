import mongoose from 'mongoose';

const scoreSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 50,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 1000000,
    },
  },
  { timestamps: true }
);

scoreSchema.index({ score: -1, createdAt: 1 });

export const Score = mongoose.model('Score', scoreSchema);
