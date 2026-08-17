const mongoose = require('mongoose');
const { METRIC_TYPES, METRICS } = require('./metrics');

/**
 * One logged health event. This collection is the source of truth for the health
 * module: daily figures, trends, streaks and points are all aggregated from it
 * rather than stored as counters that could drift.
 */
const activitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      required: [true, 'Activity type is required'],
      enum: {
        values: METRIC_TYPES,
        message: `Type must be one of: ${METRIC_TYPES.join(', ')}`
      }
    },
    value: {
      type: Number,
      required: [true, 'A value is required'],
      min: [0, 'Value cannot be negative']
    },
    unit: String,

    /**
     * When the activity happened, which is not the same as when it was logged -
     * backfilling yesterday's walk must count towards yesterday. All aggregation
     * and streak logic keys off this field.
     */
    at: {
      type: Date,
      required: true,
      default: Date.now
    },

    /** Denormalised YYYY-MM-DD in the user's local day, so grouping never re-derives it. */
    day: {
      type: String,
      required: true
    },

    notes: {
      type: String,
      maxlength: [280, 'Notes cannot exceed 280 characters']
    },
    pointsEarned: {
      type: Number,
      default: 0,
      min: 0
    },
    source: {
      type: String,
      enum: ['manual', 'import'],
      default: 'manual'
    }
  },
  { timestamps: true }
);

// The three shapes every query takes: a user's recent entries, one metric's
// history, and the entries inside a date window.
activitySchema.index({ user: 1, at: -1 });
activitySchema.index({ user: 1, type: 1, at: -1 });
activitySchema.index({ user: 1, day: 1 });

activitySchema.pre('validate', function (next) {
  const metric = METRICS[this.type];
  if (metric && !this.unit) {
    this.unit = metric.unit;
  }
  if (this.at && !this.day) {
    this.day = toDayKey(this.at);
  }
  next();
});

/** YYYY-MM-DD for a date, used as the grouping key. */
function toDayKey(date) {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${dayOfMonth}`;
}

activitySchema.statics.toDayKey = toDayKey;

/**
 * Daily totals for one metric over a window, with the aggregation each metric
 * declares (sum for quantities, last reading for weight).
 */
activitySchema.statics.dailySeries = async function (userId, type, fromDate) {
  const metric = METRICS[type];
  if (!metric) return [];

  const accumulator =
    metric.aggregate === 'sum'
      ? { $sum: '$value' }
      : metric.aggregate === 'avg'
        ? { $avg: '$value' }
        : { $last: '$value' };

  return this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId), type, at: { $gte: fromDate } } },
    { $sort: { at: 1 } },
    { $group: { _id: '$day', value: accumulator, entries: { $sum: 1 } } },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, day: '$_id', value: 1, entries: 1 } }
  ]);
};

/** The set of distinct days the user logged anything, newest first. */
activitySchema.statics.activeDays = async function (userId, limit = 400) {
  const rows = await this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: '$day' } },
    { $sort: { _id: -1 } },
    { $limit: limit }
  ]);
  return rows.map((r) => r._id);
};

module.exports = mongoose.model('Activity', activitySchema);
