const mongoose = require('mongoose');

const EXPENSE_CATEGORIES = [
  'housing',
  'food',
  'transport',
  'utilities',
  'health',
  'insurance',
  'entertainment',
  'shopping',
  'education',
  'debt',
  'savings',
  'other'
];

const INCOME_CATEGORIES = ['salary', 'freelance', 'investment', 'gift', 'refund', 'other'];

/**
 * A single money movement. The wealth module aggregates these rather than
 * storing running totals, so a corrected entry immediately corrects every
 * derived figure.
 */
const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    kind: {
      type: String,
      required: true,
      enum: {
        values: ['income', 'expense'],
        message: 'Kind must be income or expense'
      }
    },
    /** Always positive; `kind` carries the direction. */
    amount: {
      type: Number,
      required: [true, 'An amount is required'],
      min: [0.01, 'Amount must be greater than zero']
    },
    category: {
      type: String,
      required: [true, 'A category is required'],
      lowercase: true
    },
    description: {
      type: String,
      maxlength: [140, 'Description cannot exceed 140 characters']
    },
    at: {
      type: Date,
      required: true,
      default: Date.now
    },
    /** Denormalised YYYY-MM for month grouping. */
    month: {
      type: String,
      required: true
    },
    recurring: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

transactionSchema.index({ user: 1, at: -1 });
transactionSchema.index({ user: 1, month: 1, kind: 1 });

transactionSchema.path('category').validate(function (value) {
  const allowed = this.kind === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return allowed.includes(value);
}, 'Category is not valid for this kind of transaction');

transactionSchema.pre('validate', function (next) {
  if (this.at && !this.month) {
    this.month = toMonthKey(this.at);
  }
  next();
});

function toMonthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

transactionSchema.statics.toMonthKey = toMonthKey;
transactionSchema.statics.EXPENSE_CATEGORIES = EXPENSE_CATEGORIES;
transactionSchema.statics.INCOME_CATEGORIES = INCOME_CATEGORIES;

/** Income and expense totals per month, oldest first. */
transactionSchema.statics.monthlyTotals = function (userId, fromDate) {
  return this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId), at: { $gte: fromDate } } },
    { $group: { _id: { month: '$month', kind: '$kind' }, total: { $sum: '$amount' } } },
    {
      $group: {
        _id: '$_id.month',
        income: { $sum: { $cond: [{ $eq: ['$_id.kind', 'income'] }, '$total', 0] } },
        expenses: { $sum: { $cond: [{ $eq: ['$_id.kind', 'expense'] }, '$total', 0] } }
      }
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, month: '$_id', income: 1, expenses: 1 } }
  ]);
};

/** Expense totals by category for one month, largest first. */
transactionSchema.statics.categoryBreakdown = function (userId, month) {
  return this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId), kind: 'expense', month } },
    { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
    { $project: { _id: 0, category: '$_id', total: 1, count: 1 } }
  ]);
};

module.exports = mongoose.model('Transaction', transactionSchema);
