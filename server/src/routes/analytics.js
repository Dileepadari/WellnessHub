const express = require('express');
const { query, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const User = require('../models/User');
const Activity = require('../models/Activity');
const Transaction = require('../models/Transaction');
const Policy = require('../models/Policy');
const Goal = require('../models/Goal');
const { protect, authorize } = require('../middleware/auth');
const healthService = require('../services/health');
const { streaksForUser } = require('../services/streaks');

const router = express.Router();

const DAY_MS = 24 * 60 * 60 * 1000;

const rejectInvalid = (req, res) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  return true;
};

const daysFromPeriod = (period) => ({ '7d': 7, '30d': 30, '90d': 90 })[period] ?? 30;

/** Rank by total points: how many active users have strictly more. */
const rankFor = async (userId) => {
  const user = await User.findById(userId).select('totalPoints');
  if (!user) return null;
  const ahead = await User.countDocuments({
    isActive: true,
    totalPoints: { $gt: user.totalPoints }
  });
  return ahead + 1;
};

/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     summary: Cross-module figures for the overview screen
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema: { type: string, enum: ['7d', '30d', '90d'] }
 *     responses:
 *       200:
 *         description: Aggregated figures across every module
 */
router.get(
  '/dashboard',
  protect,
  [query('period').optional().isIn(['7d', '30d', '90d'])],
  async (req, res, next) => {
    if (rejectInvalid(req, res)) return;
    try {
      const period = req.query.period || '30d';
      const days = daysFromPeriod(period);
      const from = new Date(Date.now() - days * DAY_MS);
      const currentMonth = Transaction.toMonthKey(new Date());

      const [health, streaks, rank, activityTotals, monthly, policies, goals, user] =
        await Promise.all([
          healthService.summary(req.user, 7),
          streaksForUser(req.user._id),
          rankFor(req.user._id),
          healthService.totalsByType(req.user._id, from),
          Transaction.monthlyTotals(req.user._id, from),
          Policy.find({ user: req.user._id, status: 'active' }).lean(),
          Goal.find({ user: req.user._id, status: 'active' }),
          User.findById(req.user._id).select('totalPoints level experience achievements activeChallenges')
        ]);

      const thisMonth = monthly.find((m) => m.month === currentMonth) || { income: 0, expenses: 0 };
      const activeChallenges = (user.activeChallenges || []).filter((c) => !c.completed).length;

      res.status(200).json({
        success: true,
        data: {
          period,
          progression: {
            totalPoints: user.totalPoints,
            level: user.level,
            levelProgress: user.levelProgress,
            xpForNextLevel: user.xpForNextLevel,
            rank,
            achievements: (user.achievements || []).length,
            activeChallenges
          },
          streaks,
          health: {
            rows: health.rows.map(({ type, label, value, goal, progress, unit, series }) => ({
              type,
              label,
              value,
              goal,
              progress,
              unit,
              series
            })),
            entriesThisWeek: health.totalEntries,
            totalsInPeriod: activityTotals
          },
          wealth: {
            month: currentMonth,
            income: thisMonth.income,
            expenses: thisMonth.expenses,
            net: thisMonth.income - thisMonth.expenses,
            series: monthly,
            activeGoals: goals.length,
            goalProgress: goals.map((g) => ({
              id: g._id,
              title: g.title,
              progress: g.progress,
              currentValue: g.currentValue,
              targetValue: g.targetValue
            }))
          },
          insurance: {
            activePolicies: policies.length,
            totalCoverage: policies.reduce((sum, p) => sum + (p.coverageAmount || 0), 0),
            renewalsDueSoon: policies.filter((p) => {
              const days90 = (new Date(p.renewalDate) - Date.now()) / DAY_MS;
              return days90 <= 90;
            }).length
          },
          generatedAt: new Date()
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/analytics/trends:
 *   get:
 *     summary: Daily points and per-metric series over a period
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/trends',
  protect,
  [query('period').optional().isIn(['7d', '30d', '90d'])],
  async (req, res, next) => {
    if (rejectInvalid(req, res)) return;
    try {
      const period = req.query.period || '30d';
      const days = daysFromPeriod(period);
      const from = new Date(Date.now() - days * DAY_MS);

      const pointsByDay = await Activity.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(req.user._id), at: { $gte: from } } },
        { $group: { _id: '$day', points: { $sum: '$pointsEarned' }, entries: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, day: '$_id', points: 1, entries: 1 } }
      ]);

      // Zero-fill so the chart has one point per day in the window.
      const byDay = new Map(pointsByDay.map((p) => [p.day, p]));
      const dailyPoints = [];
      for (let i = days - 1; i >= 0; i -= 1) {
        const day = Activity.toDayKey(new Date(Date.now() - i * DAY_MS));
        const row = byDay.get(day);
        dailyPoints.push({ day, points: row?.points ?? 0, entries: row?.entries ?? 0 });
      }

      const health = await healthService.summary(req.user, days);

      res.status(200).json({
        success: true,
        data: {
          period,
          days,
          dailyPoints,
          metrics: health.rows.map(({ type, label, unit, series }) => ({
            type,
            label,
            unit,
            series
          }))
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/analytics/admin/overview:
 *   get:
 *     summary: Platform-wide counts
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 */
router.get('/admin/overview', protect, authorize('admin'), async (req, res, next) => {
  try {
    const [users, activities, transactions, policies] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Activity.countDocuments(),
      Transaction.countDocuments(),
      Policy.countDocuments({ status: 'active' })
    ]);

    res.status(200).json({
      success: true,
      data: { users, activities, transactions, policies }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
