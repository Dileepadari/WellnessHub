const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect, rateLimitByUser } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * /api/health/activities:
 *   post:
 *     summary: Log health activity
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - value
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [steps, water, workout, weight, sleep]
 *               value:
 *                 type: number
 *               duration:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Activity logged successfully
 */
router.post('/activities', protect, rateLimitByUser(100, 15 * 60 * 1000), [
  body('type')
    .isIn(['steps', 'water', 'workout', 'weight', 'sleep'])
    .withMessage('Invalid activity type'),
  body('value')
    .isNumeric()
    .withMessage('Value must be a number'),
  body('duration')
    .optional()
    .isNumeric()
    .withMessage('Duration must be a number'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { type, value, duration, notes } = req.body;
    const user = req.user;

    // Calculate points based on activity type
    let points = 0;
    let reason = '';

    switch (type) {
      case 'steps':
        points = Math.floor(value / 1000) * 10; // 10 points per 1000 steps
        reason = `Logged ${value} steps`;
        break;
      case 'water':
        points = value * 5; // 5 points per glass
        reason = `Drank ${value} glasses of water`;
        break;
      case 'workout':
        points = Math.floor(duration / 10) * 15; // 15 points per 10 minutes
        reason = `Workout for ${duration} minutes`;
        break;
      case 'weight':
        points = 25; // Fixed points for weight logging
        reason = `Logged weight: ${value}kg`;
        break;
      case 'sleep':
        points = value >= 7 ? 50 : 25; // Bonus for good sleep
        reason = `Logged ${value} hours of sleep`;
        break;
    }

    // Cap points to prevent abuse
    points = Math.min(points, 200);

    if (points > 0) {
      await user.addPoints(points, reason);
    }

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`user-${user._id}`).emit('health-activity-logged', {
        type,
        value,
        duration,
        points,
        totalPoints: user.totalPoints
      });
    }

    logger.info(`Health activity logged by ${user.username}: ${type} - ${value}`);

    res.status(200).json({
      success: true,
      message: 'Activity logged successfully',
      data: {
        type,
        value,
        duration,
        notes,
        pointsEarned: points,
        totalPoints: user.totalPoints
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/health/stats:
 *   get:
 *     summary: Get user health statistics
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *         description: Statistics timeframe
 *     responses:
 *       200:
 *         description: Health statistics retrieved successfully
 */
router.get('/stats', protect, async (req, res, next) => {
  try {
    const { timeframe = 'weekly' } = req.query;
    const user = req.user;

    // Mock health statistics - in production, this would come from activity logs
    const stats = {
      steps: {
        today: 8247,
        goal: user.healthMetrics?.dailyStepGoal || 10000,
        average7Days: 7850,
        streak: 5
      },
      water: {
        today: 6,
        goal: user.healthMetrics?.dailyWaterGoal || 8,
        average7Days: 7.2,
        streak: 3
      },
      workouts: {
        thisWeek: 4,
        goal: user.healthMetrics?.weeklyWorkoutGoal || 5,
        totalMinutes: 180,
        averageIntensity: 'moderate'
      },
      weight: {
        current: user.healthMetrics?.weight,
        target: user.healthMetrics?.targetWeight,
        change7Days: -0.5,
        trend: 'decreasing'
      },
      overall: {
        healthScore: 85,
        weeklyProgress: 78,
        achievements: user.achievements.filter(a => 
          a.achievementId.category === 'health'
        ).length
      }
    };

    res.status(200).json({
      success: true,
      data: {
        timeframe,
        stats
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/health/goals:
 *   put:
 *     summary: Update health goals
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dailyStepGoal:
 *                 type: number
 *               dailyWaterGoal:
 *                 type: number
 *               weeklyWorkoutGoal:
 *                 type: number
 *               targetWeight:
 *                 type: number
 *     responses:
 *       200:
 *         description: Goals updated successfully
 */
router.put('/goals', protect, [
  body('dailyStepGoal')
    .optional()
    .isInt({ min: 1000, max: 50000 })
    .withMessage('Daily step goal must be between 1000 and 50000'),
  body('dailyWaterGoal')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Daily water goal must be between 1 and 20 glasses'),
  body('weeklyWorkoutGoal')
    .optional()
    .isInt({ min: 1, max: 14 })
    .withMessage('Weekly workout goal must be between 1 and 14 sessions'),
  body('targetWeight')
    .optional()
    .isFloat({ min: 30, max: 300 })
    .withMessage('Target weight must be between 30 and 300 kg')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const updates = {};
    const allowedFields = ['dailyStepGoal', 'dailyWaterGoal', 'weeklyWorkoutGoal', 'targetWeight'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[`healthMetrics.${field}`] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    );

    logger.info(`Health goals updated for user ${user.username}`);

    res.status(200).json({
      success: true,
      message: 'Health goals updated successfully',
      data: user.healthMetrics
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;