const mongoose = require('mongoose');

const POLICY_TYPES = ['health', 'life', 'auto', 'home', 'travel', 'disability', 'dental', 'other'];

/** Annual cost, so policies on different billing cycles can be compared. */
const FREQUENCY_MULTIPLIER = {
  monthly: 12,
  quarterly: 4,
  'semi-annual': 2,
  annual: 1
};

const policySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      required: [true, 'Policy type is required'],
      enum: {
        values: POLICY_TYPES,
        message: `Type must be one of: ${POLICY_TYPES.join(', ')}`
      }
    },
    provider: {
      type: String,
      required: [true, 'Provider is required'],
      trim: true,
      maxlength: [80, 'Provider cannot exceed 80 characters']
    },
    policyNumber: {
      type: String,
      trim: true,
      maxlength: [60, 'Policy number cannot exceed 60 characters']
    },
    coverageAmount: {
      type: Number,
      required: [true, 'Coverage amount is required'],
      min: [0, 'Coverage cannot be negative']
    },
    premium: {
      type: Number,
      required: [true, 'Premium is required'],
      min: [0, 'Premium cannot be negative']
    },
    premiumFrequency: {
      type: String,
      enum: Object.keys(FREQUENCY_MULTIPLIER),
      default: 'monthly'
    },
    startDate: Date,
    renewalDate: {
      type: Date,
      required: [true, 'Renewal date is required']
    },
    deductible: {
      type: Number,
      min: 0
    },
    notes: {
      type: String,
      maxlength: [280, 'Notes cannot exceed 280 characters']
    },
    status: {
      type: String,
      enum: ['active', 'lapsed', 'cancelled'],
      default: 'active'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

policySchema.index({ user: 1, renewalDate: 1 });
policySchema.index({ user: 1, type: 1 });

/** Premium normalised to a yearly figure. */
policySchema.virtual('annualPremium').get(function () {
  const multiplier = FREQUENCY_MULTIPLIER[this.premiumFrequency] ?? 12;
  return Math.round((this.premium || 0) * multiplier);
});

/** Negative once the renewal date has passed. */
policySchema.virtual('daysUntilRenewal').get(function () {
  if (!this.renewalDate) return null;
  return Math.ceil((new Date(this.renewalDate) - Date.now()) / (1000 * 60 * 60 * 24));
});

policySchema.statics.POLICY_TYPES = POLICY_TYPES;
policySchema.statics.ESSENTIAL_TYPES = ['health', 'life', 'auto'];

module.exports = mongoose.model('Policy', policySchema);
