const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Achievement = require('../models/Achievement');
const Challenge = require('../models/Challenge');
const { protect, rateLimitByUser } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * /api/gamification/points:
 *   post:
 *     summary: Add points to user
 *     tags: [Gamification]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - points
 *               - reason
 *               - activity
 *             properties:
 *               points:
 *                 type: number
 *                 minimum: 1
 *               reason:
 *                 type: string
 *               activity:
 *                 type: string
 *                 enum: [steps, water, workout, savings, challenge, social, learning]
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Points added successfully
 *       400:
 *         description: Validation error
 */
router.post('/points', protect, rateLimitByUser(50, 15 * 60 * 1000), [
  body('points')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Points must be between 1 and 1000'),
  body('reason')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Reason must be between 3 and 100 characters'),
  body('activity')
    .isIn(['steps', 'water', 'workout', 'savings', 'challenge', 'social', 'learning', 'insurance'])
    .withMessage('Invalid activity type')
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

    const { points, reason, activity, metadata = {} } = req.body;
    const user = req.user;

    // Add points to user
    await user.addPoints(points, reason);

    // Update streak if daily activity
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastActivity = new Date(user.lastActivityDate);
    const lastActivityDate = new Date(lastActivity.getFullYear(), lastActivity.getMonth(), lastActivity.getDate());

    if (today.getTime() !== lastActivityDate.getTime()) {
      // New day activity - update streak
      await user.save(); // This will trigger the streak update in pre-save
    }

    // Check for achievements
    const userStats = {
      totalPoints: user.totalPoints,
      level: user.level,
      currentStreak: user.currentStreak,
      steps: metadata.steps || 0,
      water: metadata.water || 0,
      workouts: metadata.workouts || 0,
      savings: metadata.savings || 0,
      challenges: user.activeChallenges.filter(c => c.completed).length,
      friends: user.friends.length
    };

    const newAchievements = await Achievement.checkAndUnlockForUser(user._id, userStats);

    // Emit real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`user-${user._id}`).emit('points-earned', {
        points,
        reason,
        activity,
        totalPoints: user.totalPoints,
        level: user.level,
        newAchievements: newAchievements.map(a => ({
          id: a._id,
          title: a.title,
          description: a.description,
          icon: a.icon,
          points: a.points
        }))
      });
    }

    logger.info(`Points added to user ${user.username}: ${points} for ${reason}`);

    res.status(200).json({
      success: true,
      message: 'Points added successfully',
      data: {
        pointsEarned: points,
        totalPoints: user.totalPoints,
        level: user.level,
        currentStreak: user.currentStreak,
        newAchievements
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/gamification/achievements:
 *   get:
 *     summary: Get all achievements
 *     tags: [Gamification]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: rarity
 *         schema:
 *           type: string
 *         description: Filter by rarity
 *       - in: query
 *         name: unlocked
 *         schema:
 *           type: boolean
 *         description: Filter by unlock status (requires authentication)
 *     responses:
 *       200:
 *         description: Achievements retrieved successfully
 */
router.get('/achievements', async (req, res, next) => {
  try {
    const { category, rarity, unlocked } = req.query;
    
    let query = { isActive: true, isPublic: true };
    
    if (category) {
      query.category = category;
    }
    
    if (rarity) {
      query.rarity = rarity;
    }

    // If user is authenticated and wants filtered achievements
    if (req.user && unlocked !== undefined) {
      const user = await User.findById(req.user._id);
      const userAchievementIds = user.achievements.map(a => a.achievementId.toString());
      
      if (unlocked === 'true') {
        query._id = { $in: userAchievementIds };
      } else {
        query._id = { $nin: userAchievementIds };
        query.isSecret = false; // Don't show secret achievements if not unlocked
      }
    } else {
      query.isSecret = false; // Don't show secret achievements to non-authenticated users
    }

    const achievements = await Achievement.find(query)
      .sort({ category: 1, points: 1 })
      .limit(100);

    res.status(200).json({
      success: true,
      data: achievements
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/gamification/achievements/featured:
 *   get:
 *     summary: Get featured achievements
 *     tags: [Gamification]
 *     responses:
 *       200:
 *         description: Featured achievements retrieved successfully
 */
router.get('/achievements/featured', async (req, res, next) => {
  try {
    const featuredAchievements = await Achievement.getFeatured(10);

    res.status(200).json({
      success: true,
      data: featuredAchievements
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/gamification/achievements/rare:
 *   get:
 *     summary: Get rare achievements
 *     tags: [Gamification]
 *     responses:
 *       200:
 *         description: Rare achievements retrieved successfully
 */
router.get('/achievements/rare', async (req, res, next) => {
  try {
    const rareAchievements = await Achievement.getRareAchievements(10);

    res.status(200).json({
      success: true,
      data: rareAchievements
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/gamification/achievements/{id}:
 *   get:
 *     summary: Get achievement by ID
 *     tags: [Gamification]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Achievement ID
 *     responses:
 *       200:
 *         description: Achievement retrieved successfully
 *       404:
 *         description: Achievement not found
 */
router.get('/achievements/:id', async (req, res, next) => {
  try {
    const achievement = await Achievement.findById(req.params.id);

    if (!achievement || !achievement.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Achievement not found'
      });
    }

    // Check if secret achievement and user hasn't unlocked it
    if (achievement.isSecret && req.user) {
      const user = await User.findById(req.user._id);
      const hasUnlocked = user.achievements.some(
        a => a.achievementId.toString() === achievement._id.toString()
      );
      
      if (!hasUnlocked) {
        return res.status(404).json({
          success: false,
          message: 'Achievement not found'
        });
      }
    } else if (achievement.isSecret) {
      return res.status(404).json({
        success: false,
        message: 'Achievement not found'
      });
    }

    res.status(200).json({
      success: true,
      data: achievement
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/gamification/leaderboard:
 *   get:
 *     summary: Get global leaderboard
 *     tags: [Gamification]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [points, level, streak, achievements]
 *         description: Leaderboard category
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, all-time]
 *         description: Time frame for leaderboard
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of users to return
 *     responses:
 *       200:
 *         description: Leaderboard retrieved successfully
 */
router.get('/leaderboard', async (req, res, next) => {
  try {
    const { category = 'points', timeframe = 'all-time', limit = 50 } = req.query;
    
    let sortField;
    switch (category) {
      case 'points':
        sortField = 'totalPoints';
        break;
      case 'level':
        sortField = 'level';
        break;
      case 'streak':
        sortField = 'currentStreak';
        break;
      case 'achievements':
        sortField = 'achievements';
        break;
      default:
        sortField = 'totalPoints';
    }

    // For now, we'll implement all-time leaderboard
    // In production, you'd want to implement time-based filtering
    const leaderboard = await User.getLeaderboard(parseInt(limit), sortField);

    // Add rank to each user
    const rankedLeaderboard = leaderboard.map((user, index) => ({
      ...user.toObject(),
      rank: index + 1
    }));

    res.status(200).json({
      success: true,
      data: {
        category,
        timeframe,
        users: rankedLeaderboard
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/gamification/progress:
 *   get:
 *     summary: Get user's progress summary
 *     tags: [Gamification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Progress summary retrieved successfully
 */
router.get('/progress', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('achievements.achievementId', 'title description icon points rarity category')
      .populate('activeChallenges.challengeId', 'title category points endDate');

    // Calculate progress statistics
    const totalAchievements = await Achievement.countDocuments({ isActive: true, isPublic: true, isSecret: false });
    const unlockedAchievements = user.achievements.length;
    const achievementProgress = Math.round((unlockedAchievements / totalAchievements) * 100);

    const activeChallenges = user.activeChallenges.filter(c => !c.completed);
    const completedChallenges = user.activeChallenges.filter(c => c.completed);

    // Get recent achievements (last 10)
    const recentAchievements = user.achievements
      .sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt))
      .slice(0, 10);

    // Calculate level progress
    const currentLevelXP = (user.level - 1) * 1000;
    const nextLevelXP = user.level * 1000;
    const progressToNextLevel = user.experience - currentLevelXP;
    const totalXPForLevel = nextLevelXP - currentLevelXP;
    const levelProgressPercentage = Math.round((progressToNextLevel / totalXPForLevel) * 100);

    const progressSummary = {
      level: {
        current: user.level,
        progress: levelProgressPercentage,
        currentXP: user.experience,
        xpForNextLevel: nextLevelXP,
        xpToNextLevel: nextLevelXP - user.experience
      },
      points: {
        total: user.totalPoints,
        available: user.availablePoints,
        rank: await User.getUserRank(user._id, 'totalPoints')
      },
      streak: {
        current: user.currentStreak,
        longest: user.longestStreak,
        lastActivity: user.lastActivityDate
      },
      achievements: {
        unlocked: unlockedAchievements,
        total: totalAchievements,
        progress: achievementProgress,
        recent: recentAchievements
      },
      challenges: {
        active: activeChallenges.length,
        completed: completedChallenges.length,
        activeChallengesList: activeChallenges,
        recentCompletions: completedChallenges
          .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
          .slice(0, 5)
      }
    };

    res.status(200).json({
      success: true,
      data: progressSummary
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/gamification/daily-bonus:
 *   post:
 *     summary: Claim daily login bonus
 *     tags: [Gamification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Daily bonus claimed successfully
 *       400:
 *         description: Daily bonus already claimed today
 */
router.post('/daily-bonus', protect, async (req, res, next) => {
  try {
    const user = req.user;
    
    // Check if user has already claimed bonus today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastActivity = new Date(user.lastActivityDate);
    lastActivity.setHours(0, 0, 0, 0);
    
    if (lastActivity.getTime() === today.getTime()) {
      return res.status(400).json({
        success: false,
        message: 'Daily bonus already claimed today'
      });
    }

    // Calculate bonus based on streak
    let bonusPoints = 50; // Base daily bonus
    if (user.currentStreak >= 7) bonusPoints += 25; // Week streak bonus
    if (user.currentStreak >= 30) bonusPoints += 50; // Month streak bonus
    if (user.currentStreak >= 100) bonusPoints += 100; // Century streak bonus

    // Add bonus points
    await user.addPoints(bonusPoints, `Daily login bonus (${user.currentStreak + 1} day streak)`);

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`user-${user._id}`).emit('daily-bonus-claimed', {
        points: bonusPoints,
        streak: user.currentStreak,
        totalPoints: user.totalPoints
      });
    }

    logger.info(`Daily bonus claimed by user ${user.username}: ${bonusPoints} points`);

    res.status(200).json({
      success: true,
      message: 'Daily bonus claimed successfully',
      data: {
        bonusPoints,
        streak: user.currentStreak,
        totalPoints: user.totalPoints,
        level: user.level
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/gamification/spend-points:
 *   post:
 *     summary: Spend user points
 *     tags: [Gamification]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - points
 *               - item
 *             properties:
 *               points:
 *                 type: number
 *                 minimum: 1
 *               item:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Points spent successfully
 *       400:
 *         description: Insufficient points or validation error
 */
router.post('/spend-points', protect, [
  body('points')
    .isInt({ min: 1 })
    .withMessage('Points must be a positive integer'),
  body('item')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Item name is required'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters')
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

    const { points, item, description } = req.body;
    const user = req.user;

    if (user.availablePoints < points) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient points'
      });
    }

    // Spend points
    await user.spendPoints(points, `Purchased: ${item}`);

    logger.info(`Points spent by user ${user.username}: ${points} for ${item}`);

    res.status(200).json({
      success: true,
      message: 'Points spent successfully',
      data: {
        pointsSpent: points,
        availablePoints: user.availablePoints,
        item,
        description
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;