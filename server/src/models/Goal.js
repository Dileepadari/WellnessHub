const mongoose = require('mongoose');

/**
 * A target the user is working towards, in either the health or wealth domain.
 * Progress is the sum of its contributions rather than a stored running total,
 * so deleting a contribution corrects the goal automatically.
 */
const goalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    domain: {
      type: String,
      required: true,
      enum: {
        values: ['health', 'wealth'],
        message: 'Domain must be health or wealth'
      }
    },
    title: {
      type: String,
      required: [true, 'A title is required'],
      trim: true,
      maxlength: [80, 'Title cannot exceed 80 characters']
    },
    targetValue: {
      type: Number,
      required: [true, 'A target value is required'],
      min: [0.01, 'Target must be greater than zero']
    },
    unit: {
      type: String,
      default: 'USD'
    },
    dueDate: Date,
    contributions: [
      {
        amount: { type: Number, required: true },
        at: { type: Date, default: Date.now },
        note: { type: String, maxlength: 140 }
      }
    ],
    status: {
      type: String,
      enum: ['active', 'achieved', 'abandoned'],
      default: 'active'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

goalSchema.index({ user: 1, domain: 1, status: 1 });

// Guarded with `|| []`: a populate() projection can omit `contributions`, and
// virtuals still run when the document is serialised.
goalSchema.virtual('currentValue').get(function () {
  return (this.contributions || []).reduce((sum, c) => sum + (c.amount || 0), 0);
});

goalSchema.virtual('progress').get(function () {
  if (!this.targetValue) return 0;
  return Math.max(0, Math.min(100, Math.round((this.currentValue / this.targetValue) * 100)));
});

goalSchema.virtual('daysRemaining').get(function () {
  if (!this.dueDate) return null;
  return Math.ceil((new Date(this.dueDate) - Date.now()) / (1000 * 60 * 60 * 24));
});

// A goal that reaches its target marks itself achieved, so the UI never has to
// special-case a 100%-but-still-active goal.
goalSchema.pre('save', function (next) {
  if (this.status === 'active' && this.currentValue >= this.targetValue) {
    this.status = 'achieved';
  }
  next();
});

module.exports = mongoose.model('Goal', goalSchema);
