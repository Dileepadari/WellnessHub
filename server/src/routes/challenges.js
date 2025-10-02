const express = require('express');
const { body, validationResult } = require('express-validator');
const Challenge = require('../models/Challenge');
const Team = require('../models/Team');
const User = require('../models/User');
const { protect, rateLimitByUser, validateResource } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * /api/challenges:
 *   get:
 *     summary: Get challenges
 *     tags: [Challenges]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by type
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: string
 *         description: Filter by difficulty
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of challenges to return
 *     responses:
 *       200:
 *         description: Challenges retrieved successfully
 */
router.get('/', async (req, res, next) => {
  try {
    const { 
      category, 
      type, 
      difficulty, 
      status = 'active', 
      featured,
      limit = 20 
    } = req.query;

    let query = { 
      isActive: true, 
      isPublic: true,
      status
    };

    if (category) query.category = category;
    if (type) query.type = type;
    if (difficulty) query.difficulty = difficulty;
    if (featured === 'true') query.featured = true;

    const challenges = await Challenge.find(query)
      .populate('createdBy', 'username firstName lastName avatar')
      .sort({ featured: -1, 'stats.totalParticipants': -1, createdAt: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: challenges
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/challenges/{id}:
 *   get:
 *     summary: Get challenge by ID
 *     tags: [Challenges]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Challenge ID
 *     responses:
 *       200:
 *         description: Challenge retrieved successfully
 *       404:
 *         description: Challenge not found
 */
router.get('/:id', validateResource(Challenge), async (req, res, next) => {
  try {
    const challenge = req.resource;
    
    await challenge.populate('createdBy', 'username firstName lastName avatar');
    await challenge.populate('participants.userId', 'username firstName lastName avatar level');

    // Get leaderboard
    const leaderboard = challenge.getLeaderboard(10);

    res.status(200).json({
      success: true,
      data: {
        ...challenge.toObject(),
        leaderboard
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/challenges:
 *   post:
 *     summary: Create a new challenge
 *     tags: [Challenges]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - category
 *               - type
 *               - difficulty
 *               - points
 *               - duration
 *               - target
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               type:
 *                 type: string
 *               difficulty:
 *                 type: string
 *               points:
 *                 type: number
 *               duration:
 *                 type: number
 *               target:
 *                 type: object
 *     responses:
 *       201:
 *         description: Challenge created successfully
 *       400:
 *         description: Validation error
 */
router.post('/', protect, rateLimitByUser(5, 60 * 60 * 1000), [
  body('title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  body('category')
    .isIn(['health', 'wealth', 'insurance', 'wellness', 'community', 'learning'])
    .withMessage('Invalid category'),
  body('type')
    .isIn(['individual', 'team', 'community', 'global'])
    .withMessage('Invalid type'),
  body('difficulty')
    .isIn(['easy', 'medium', 'hard', 'expert'])
    .withMessage('Invalid difficulty'),
  body('points')
    .isInt({ min: 10, max: 1000 })
    .withMessage('Points must be between 10 and 1000'),
  body('duration')
    .isInt({ min: 1, max: 365 })
    .withMessage('Duration must be between 1 and 365 days')
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

    const challengeData = {
      ...req.body,
      createdBy: req.user._id,
      experiencePoints: req.body.points, // XP = points for simplicity
      startDate: new Date(),
      status: 'published'
    };

    const challenge = await Challenge.create(challengeData);
    await challenge.populate('createdBy', 'username firstName lastName avatar');

    logger.info(`Challenge created by ${req.user.username}: ${challenge.title}`);

    res.status(201).json({
      success: true,
      message: 'Challenge created successfully',
      data: challenge
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/challenges/{id}/join:
 *   post:
 *     summary: Join a challenge
 *     tags: [Challenges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Challenge ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               teamId:
 *                 type: string
 *                 description: Team ID for team challenges
 *     responses:
 *       200:
 *         description: Successfully joined challenge
 *       400:
 *         description: Cannot join challenge
 */
router.post('/:id/join', protect, validateResource(Challenge), async (req, res, next) => {
  try {
    const challenge = req.resource;
    const user = req.user;
    const { teamId } = req.body;

    // Check if challenge is still active
    if (challenge.status !== 'active' && challenge.status !== 'published') {
      return res.status(400).json({
        success: false,
        message: 'Challenge is not active'
      });
    }

    // Add participant to challenge
    await challenge.addParticipant(user._id, teamId);

    // Add challenge to user's active challenges
    const userChallengeData = {
      challengeId: challenge._id,
      joinedAt: new Date(),
      progress: 0,
      completed: false
    };

    if (teamId) {
      userChallengeData.teamId = teamId;
    }

    await User.findByIdAndUpdate(user._id, {
      $push: { activeChallenges: userChallengeData }
    });

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`challenge-${challenge._id}`).emit('participant-joined', {
        userId: user._id,
        username: user.username,
        avatar: user.avatar,
        totalParticipants: challenge.participants.length
      });

      io.to(`user-${user._id}`).emit('challenge-joined', {
        challengeId: challenge._id,
        title: challenge.title,
        points: challenge.points
      });
    }

    logger.info(`User ${user.username} joined challenge: ${challenge.title}`);

    res.status(200).json({
      success: true,
      message: 'Successfully joined challenge',
      data: {
        challengeId: challenge._id,
        participantCount: challenge.participants.length
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/challenges/{id}/progress:
 *   post:
 *     summary: Update challenge progress
 *     tags: [Challenges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Challenge ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - progress
 *             properties:
 *               progress:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               value:
 *                 type: number
 *                 description: Actual value achieved
 *     responses:
 *       200:
 *         description: Progress updated successfully
 */
router.post('/:id/progress', protect, validateResource(Challenge), [
  body('progress')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Progress must be between 0 and 100'),
  body('value')
    .optional()
    .isNumeric()
    .withMessage('Value must be a number')
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

    const challenge = req.resource;
    const user = req.user;
    const { progress, value } = req.body;

    // Update progress in challenge
    await challenge.updateProgress(user._id, progress);

    // Update progress in user's active challenges
    await User.findOneAndUpdate(
      { 
        _id: user._id, 
        'activeChallenges.challengeId': challenge._id 
      },
      { 
        $set: { 
          'activeChallenges.$.progress': progress,
          ...(progress >= 100 && {
            'activeChallenges.$.completed': true,
            'activeChallenges.$.completedAt': new Date()
          })
        }
      }
    );

    // If challenge completed, award points
    if (progress >= 100) {
      await user.addPoints(challenge.points, `Completed challenge: ${challenge.title}`);
      
      logger.info(`User ${user.username} completed challenge: ${challenge.title}`);
    }

    // Emit real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`challenge-${challenge._id}`).emit('progress-update', {
        userId: user._id,
        username: user.username,
        progress,
        value,
        completed: progress >= 100
      });

      if (progress >= 100) {
        io.to(`user-${user._id}`).emit('challenge-completed', {
          challengeId: challenge._id,
          title: challenge.title,
          points: challenge.points,
          totalPoints: user.totalPoints
        });
      }
    }

    res.status(200).json({
      success: true,
      message: progress >= 100 ? 'Challenge completed!' : 'Progress updated successfully',
      data: {
        progress,
        value,
        completed: progress >= 100,
        pointsEarned: progress >= 100 ? challenge.points : 0
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/challenges/{id}/leaderboard:
 *   get:
 *     summary: Get challenge leaderboard
 *     tags: [Challenges]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Challenge ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of participants to return
 *     responses:
 *       200:
 *         description: Leaderboard retrieved successfully
 */
router.get('/:id/leaderboard', validateResource(Challenge), async (req, res, next) => {
  try {
    const challenge = req.resource;
    const { limit = 50 } = req.query;
    
    const leaderboard = challenge.getLeaderboard(parseInt(limit));
    
    // Populate user data for leaderboard
    const populatedLeaderboard = await Promise.all(
      leaderboard.map(async (entry) => {
        const user = await User.findById(entry.userId)
          .select('username firstName lastName avatar level');
        return {
          ...entry,
          user
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        challengeId: challenge._id,
        challengeTitle: challenge.title,
        leaderboard: populatedLeaderboard
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/challenges/trending:
 *   get:
 *     summary: Get trending challenges
 *     tags: [Challenges]
 *     responses:
 *       200:
 *         description: Trending challenges retrieved successfully
 */
router.get('/trending', async (req, res, next) => {
  try {
    const trendingChallenges = await Challenge.getTrending(10);

    res.status(200).json({
      success: true,
      data: trendingChallenges
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/challenges/featured:
 *   get:
 *     summary: Get featured challenges
 *     tags: [Challenges]
 *     responses:
 *       200:
 *         description: Featured challenges retrieved successfully
 */
router.get('/featured', async (req, res, next) => {
  try {
    const featuredChallenges = await Challenge.getFeatured(5);

    res.status(200).json({
      success: true,
      data: featuredChallenges
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;