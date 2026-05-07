const mongoose = require('mongoose');

const OPERATIONS = ['uppercase', 'lowercase', 'reverse', 'word_count'];
const STATUSES = ['pending', 'running', 'success', 'failed'];

const taskSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [100, 'Title too long']
    },
    inputText: {
      type: String,
      required: [true, 'Input text is required'],
      maxlength: [10000, 'Input text too long']
    },
    operation: {
      type: String,
      enum: OPERATIONS,
      required: [true, 'Operation is required']
    },
    status: {
      type: String,
      enum: STATUSES,
      default: 'pending'
    },
    result: {
      type: String,
      default: null
    },
    logs: [
      {
        message: String,
        level: { type: String, enum: ['info', 'warn', 'error'], default: 'info' },
        timestamp: { type: Date, default: Date.now }
      }
    ],
    startedAt: Date,
    completedAt: Date,
    errorMessage: String
  },
  { timestamps: true }
);

// Compound index for user's tasks sorted by creation time
taskSchema.index({ user: 1, createdAt: -1 });
taskSchema.index({ status: 1 });
taskSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Task', taskSchema);
module.exports.OPERATIONS = OPERATIONS;
