import mongoose from 'mongoose';

const likeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  targetType: {
    type: String,
    enum: ['Post', 'Comment'],
    required: true,
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'targetType',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

likeSchema.index({ user: 1, targetType: 1, targetId: 1 }, { unique: true });

export default mongoose.model('Like', likeSchema);
