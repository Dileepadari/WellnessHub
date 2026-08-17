const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Transaction = require('../models/Transaction');
const Goal = require('../models/Goal');
const User = require('../models/User');
const { protect, rateLimitByUser } = require('../middleware/auth');

const router = express.Router();

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

const rejectInvalid = (req, res) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  return true;
};

function mean(values) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

/**
 * @swagger
 * /api/wealth/categories:
 *   get:
 *     summary: Valid transaction categories
 *     tags: [Wealth]
 */
router.get('/categories', (req, res) => {
  res.status(200).json({
    success: true,
    data: { income: Transaction.INCOME_CATEGORIES, expense: Transaction.EXPENSE_CATEGORIES }
  });
});

/**
 * @swagger
 * /api/wealth/summary:
 *   get:
 *     summary: Budget, savings rate and category breakdown from real transactions
 *     tags: [Wealth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: months
 *         schema: { type: integer, minimum: 1, maximum: 24 }
 *     responses:
 *       200:
 *         description: Wealth summary aggregated from the Transaction collection
 */
router.get(
  '/summary',
  protect,
  [query('months').optional().isInt({ min: 1, max: 24 }).toInt()],
  async (req, res, next) => {
    if (rejectInvalid(req, res)) return;
    try {
      const months = req.query.months || 6;
      const from = new Date(Date.now() - months * MONTH_MS);
      const currentMonth = Transaction.toMonthKey(new Date());

      const [series, categories] = await Promise.all([
        Transaction.monthlyTotals(req.user._id, from),
        Transaction.categoryBreakdown(req.user._id, currentMonth)
      ]);

      const thisMonth = series.find((row) => row.month === currentMonth) || {
        month: currentMonth,
        income: 0,
        expenses: 0
      };

      const net = thisMonth.income - thisMonth.expenses;
      const savingsRate = thisMonth.income > 0 ? Math.round((net / thisMonth.income) * 100) : null;

      // Averages exclude the current month, which is usually partial and would
      // drag the figure down for no real reason.
      const completed = series.filter((row) => row.month !== currentMonth);

      res.status(200).json({
        success: true,
        data: {
          month: currentMonth,
          income: thisMonth.income,
          expenses: thisMonth.expenses,
          net,
          savingsRate,
          averageIncome: mean(completed.map((r) => r.income)),
          averageExpenses: mean(completed.map((r) => r.expenses)),
          series,
          categories,
          profile: req.user.financialMetrics || {}
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/wealth/transactions:
 *   get:
 *     summary: List transactions
 *     tags: [Wealth]
 *     security:
 *       - bearerAuth: []
 *   post:
 *     summary: Record a transaction
 *     tags: [Wealth]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/transactions',
  protect,
  [
    query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
    query('kind').optional().isIn(['income', 'expense']),
    query('month').optional().matches(/^\d{4}-\d{2}$/)
  ],
  async (req, res, next) => {
    if (rejectInvalid(req, res)) return;
    try {
      const filter = { user: req.user._id };
      if (req.query.kind) filter.kind = req.query.kind;
      if (req.query.month) filter.month = req.query.month;

      const transactions = await Transaction.find(filter)
        .sort({ at: -1 })
        .limit(req.query.limit || 50)
        .lean();

      res.status(200).json({ success: true, data: { transactions } });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/transactions',
  protect,
  rateLimitByUser(120, 15 * 60 * 1000),
  [
    body('kind').isIn(['income', 'expense']).withMessage('Kind must be income or expense'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than zero').toFloat(),
    body('category').trim().notEmpty().withMessage('A category is required'),
    body('description').optional().trim().isLength({ max: 140 }),
    body('at').optional().isISO8601().toDate()
  ],
  async (req, res, next) => {
    if (rejectInvalid(req, res)) return;
    try {
      const at = req.body.at || new Date();
      const transaction = await Transaction.create({
        user: req.user._id,
        kind: req.body.kind,
        amount: req.body.amount,
        category: req.body.category,
        description: req.body.description,
        at,
        month: Transaction.toMonthKey(at)
      });

      res.status(201).json({ success: true, message: 'Transaction recorded', data: { transaction } });
    } catch (error) {
      if (error.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: error.message });
      }
      next(error);
    }
  }
);

router.delete('/transactions/:id', protect, async (req, res, next) => {
  try {
    // Scoped by user so one account cannot delete another's records.
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    res.status(200).json({ success: true, message: 'Transaction deleted', data: { transaction } });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid transaction id' });
    }
    next(error);
  }
});

/**
 * @swagger
 * /api/wealth/goals:
 *   get:
 *     summary: Financial goals with progress
 *     tags: [Wealth]
 *     security:
 *       - bearerAuth: []
 *   post:
 *     summary: Create a financial goal
 *     tags: [Wealth]
 *     security:
 *       - bearerAuth: []
 */
router.get('/goals', protect, async (req, res, next) => {
  try {
    const goals = await Goal.find({ user: req.user._id, domain: 'wealth' }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: { goals } });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/goals',
  protect,
  rateLimitByUser(30, 24 * 60 * 60 * 1000),
  [
    body('title').trim().isLength({ min: 1, max: 80 }).withMessage('A title is required'),
    body('targetValue')
      .isFloat({ min: 0.01 })
      .withMessage('Target must be greater than zero')
      .toFloat(),
    body('dueDate').optional().isISO8601().toDate(),
    body('unit').optional().trim().isLength({ max: 12 })
  ],
  async (req, res, next) => {
    if (rejectInvalid(req, res)) return;
    try {
      const goal = await Goal.create({
        user: req.user._id,
        domain: 'wealth',
        title: req.body.title,
        targetValue: req.body.targetValue,
        unit: req.body.unit || 'USD',
        dueDate: req.body.dueDate
      });

      res.status(201).json({ success: true, message: 'Goal created', data: { goal } });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/wealth/goals/{id}/contributions:
 *   post:
 *     summary: Add progress to a goal
 *     tags: [Wealth]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/goals/:id/contributions',
  protect,
  [
    body('amount').isFloat().withMessage('An amount is required').toFloat(),
    body('note').optional().trim().isLength({ max: 140 })
  ],
  async (req, res, next) => {
    if (rejectInvalid(req, res)) return;
    try {
      const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });

      if (!goal) {
        return res.status(404).json({ success: false, message: 'Goal not found' });
      }

      goal.contributions.push({ amount: req.body.amount, note: req.body.note });
      // The pre-save hook flips status to achieved once the target is reached.
      await goal.save();

      res.status(200).json({ success: true, message: 'Contribution added', data: { goal } });
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(400).json({ success: false, message: 'Invalid goal id' });
      }
      next(error);
    }
  }
);

router.delete('/goals/:id', protect, async (req, res, next) => {
  try {
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }
    res.status(200).json({ success: true, message: 'Goal deleted', data: { goal } });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid goal id' });
    }
    next(error);
  }
});

/**
 * @swagger
 * /api/wealth/profile:
 *   put:
 *     summary: Update standing financial figures
 *     tags: [Wealth]
 *     security:
 *       - bearerAuth: []
 */
router.put(
  '/profile',
  protect,
  [
    body('monthlyIncome').optional().isFloat({ min: 0 }).toFloat(),
    body('monthlySavingsGoal').optional().isFloat({ min: 0 }).toFloat(),
    body('emergencyFundGoal').optional().isFloat({ min: 0 }).toFloat(),
    body('currentSavings').optional().isFloat({ min: 0 }).toFloat(),
    body('creditScore').optional().isInt({ min: 300, max: 850 }).toInt(),
    body('riskTolerance').optional().isIn(['conservative', 'moderate', 'aggressive'])
  ],
  async (req, res, next) => {
    if (rejectInvalid(req, res)) return;
    try {
      const allowed = [
        'monthlyIncome',
        'monthlySavingsGoal',
        'emergencyFundGoal',
        'currentSavings',
        'creditScore',
        'riskTolerance'
      ];

      const updates = {};
      for (const field of allowed) {
        if (req.body[field] !== undefined) updates[`financialMetrics.${field}`] = req.body[field];
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, message: 'No profile fields supplied' });
      }

      const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true });

      res.status(200).json({
        success: true,
        message: 'Profile updated',
        data: { financialMetrics: user.financialMetrics }
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
