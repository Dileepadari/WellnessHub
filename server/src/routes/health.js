const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Activity = require('../models/Activity');
const User = require('../models/User');
const { METRIC_TYPES, pointsFor, publicMetrics } = require('../models/metrics');
const { protect, rateLimitByUser } = require('../middleware/auth');
const healthService = require('../services/health');
const { recompute } = require('../services/progression');
const logger = require('../utils/logger');

const router = express.Router();

const rejectInvalid = (req, res) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  return true;
};

/**
 * @swagger
 * /api/health/metrics:
 *   get:
 *     summary: Metric definitions the client renders columns from
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Metric definitions
 */
router.get('/metrics', (req, res) => {
  res.status(200).json({ success: true, data: { metrics: publicMetrics() } });
});

/**
 * @swagger
 * /api/health/summary:
 *   get:
 *     summary: Current figure, goal and daily series for every metric
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema: { type: integer, minimum: 1, maximum: 90 }
 *     responses:
 *       200:
 *         description: Health summary aggregated from logged activities
 */
router.get(
  '/summary',
  protect,
  [query('days').optional().isInt({ min: 1, max: 90 }).toInt()],
  async (req, res, next) => {
    if (rejectInvalid(req, res)) return;
    try {
      const data = await healthService.summary(req.user, req.query.days || 7);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/health/activities:
 *   get:
 *     summary: Recent logged activities
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *   post:
 *     summary: Log an activity
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/activities',
  protect,
  [query('limit').optional().isInt({ min: 1, max: 200 }).toInt()],
  async (req, res, next) => {
    if (rejectInvalid(req, res)) return;
    try {
      const entries = await healthService.recentEntries(req.user._id, req.query.limit || 25);
      res.status(200).json({ success: true, data: { entries } });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/activities',
  protect,
  rateLimitByUser(120, 15 * 60 * 1000),
  [
    body('type').isIn(METRIC_TYPES).withMessage(`Type must be one of: ${METRIC_TYPES.join(', ')}`),
    body('value').isFloat({ min: 0 }).withMessage('Value must be a positive number').toFloat(),
    body('at').optional().isISO8601().withMessage('Provide a valid date').toDate(),
    body('notes').optional().trim().isLength({ max: 280 })
  ],
  async (req, res, next) => {
    if (rejectInvalid(req, res)) return;
    try {
      const { type, value, at, notes } = req.body;
      const happenedAt = at || new Date();

      // A future-dated entry would corrupt today's totals and the streak.
      if (happenedAt > new Date()) {
        return res.status(400).json({ success: false, message: 'Cannot log an activity in the future' });
      }

      const pointsEarned = pointsFor(type, value);

      const activity = await Activity.create({
        user: req.user._id,
        type,
        value,
        at: happenedAt,
        day: Activity.toDayKey(happenedAt),
        notes,
        pointsEarned
      });

      if (pointsEarned > 0) {
        await req.user.addPoints(pointsEarned, `Logged ${type}`);
      }
      req.user.lastActivityDate = happenedAt;

      // One hook fans out to challenge progress, achievements and streaks, and
      // pushes the result over the socket.
      const progression = await recompute(req.user, { io: req.app.get('io') });

      logger.debug(`${req.user.username} logged ${value} ${type}`);

      res.status(201).json({
        success: true,
        message: 'Activity logged',
        data: {
          activity,
          pointsEarned,
          streaks: progression.streaks,
          challengesCompleted: progression.challengesCompleted,
          achievementsUnlocked: progression.achievementsUnlocked
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/health/activities/{id}:
 *   delete:
 *     summary: Delete a logged activity
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/activities/:id', protect, async (req, res, next) => {
  try {
    // Scoped by user, so one account cannot delete another's entries.
    const activity = await Activity.findOneAndDelete({ _id: req.params.id, user: req.user._id });

    if (!activity) {
      return res.status(404).json({ success: false, message: 'Activity not found' });
    }

    res.status(200).json({ success: true, message: 'Activity deleted', data: { activity } });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid activity id' });
    }
    next(error);
  }
});

/**
 * @swagger
 * /api/health/goals:
 *   put:
 *     summary: Update daily and weekly health goals
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 */
router.put(
  '/goals',
  protect,
  [
    body('dailyStepGoal').optional().isInt({ min: 1, max: 100000 }).toInt(),
    body('dailyWaterGoal').optional().isInt({ min: 1, max: 40 }).toInt(),
    body('weeklyWorkoutMinuteGoal').optional().isInt({ min: 1, max: 5000 }).toInt(),
    body('dailySleepGoal').optional().isFloat({ min: 1, max: 24 }).toFloat(),
    body('dailyMeditationGoal').optional().isInt({ min: 1, max: 600 }).toInt(),
    body('targetWeight').optional().isFloat({ min: 1, max: 500 }).toFloat()
  ],
  async (req, res, next) => {
    if (rejectInvalid(req, res)) return;
    try {
      const allowed = [
        'dailyStepGoal',
        'dailyWaterGoal',
        'weeklyWorkoutMinuteGoal',
        'dailySleepGoal',
        'dailyMeditationGoal',
        'targetWeight'
      ];

      const updates = {};
      for (const field of allowed) {
        if (req.body[field] !== undefined) {
          updates[`healthMetrics.${field}`] = req.body[field];
        }
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, message: 'No goal fields supplied' });
      }

      const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true });

      res.status(200).json({
        success: true,
        message: 'Goals updated',
        data: { healthMetrics: user.healthMetrics }
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
