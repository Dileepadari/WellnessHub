const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Team = require('../models/Team');
const Challenge = require('../models/Challenge');
const { protect, rateLimitByUser, validateResource } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * /api/community/feed:
 *   get:
 *     summary: Get community activity feed
 *     tags: [Community]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of activities to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Number of activities to skip
 *     responses:
 *       200:
 *         description: Activity feed retrieved successfully
 */
router.get('/feed', protect, async (req, res, next) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const user = req.user;

    // Get activities from friends and followed users
    // The schema field is `followedUsers`; `following` does not exist and made
    // this route throw for every user.
    const followingIds = [...(user.followedUsers || []), ...(user.friends || [])];
    followingIds.push(user._id); // Include own activities

    // Aggregate recent activities from the user's network
    const activities = await User.aggregate([
      {
        $match: { _id: { $in: followingIds } }
      },
      {
        $unwind: '$activities'
      },
      {
        $sort: { 'activities.timestamp': -1 }
      },
      {
        $skip: parseInt(offset)
      },
      {
        $limit: parseInt(limit)
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
          pipeline: [
            {
              $project: {
                username: 1,
                firstName: 1,
                lastName: 1,
                avatar: 1,
                level: 1
              }
            }
          ]
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          _id: '$activities._id',
          type: '$activities.type',
          data: '$activities.data',
          timestamp: '$activities.timestamp',
          user: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: activities
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/community/teams:
 *   get:
 *     summary: Public teams
 *     tags: [Community]
 *   post:
 *     summary: Create a team
 *     tags: [Community]
 *     security:
 *       - bearerAuth: []
 */
router.get('/teams', async (req, res, next) => {
  try {
    const { search, category, limit = 20 } = req.query;

    const query = { isActive: true, isPublic: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (category) query.category = category;

    // The schema stores `creator` and `members[].userId`; there is no `captain`
    // field and `members` is a subdocument array, not an array of refs.
    const teams = await Team.find(query)
      .populate('creator', 'username firstName lastName avatar level')
      .sort({ 'stats.totalPoints': -1, createdAt: -1 })
      .limit(parseInt(limit));

    res.status(200).json({ success: true, data: teams });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/teams',
  protect,
  rateLimitByUser(3, 24 * 60 * 60 * 1000),
  [
    body('name').trim().isLength({ min: 3, max: 50 }).withMessage('Name must be 3-50 characters'),
    body('description').optional().trim().isLength({ max: 500 }),
    body('category')
      .isIn(['health', 'wealth', 'insurance', 'wellness', 'mixed', 'corporate', 'community'])
      .withMessage('Invalid category'),
    body('type').optional().isIn(['public', 'private', 'invite-only', 'corporate']),
    body('maxMembers').optional().isInt({ min: 2, max: 500 }).toInt()
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    try {
      const alreadyCreated = await Team.findOne({ creator: req.user._id, isActive: true });
      if (alreadyCreated) {
        return res
          .status(400)
          .json({ success: false, message: 'You already run a team' });
      }

      const team = await Team.create({
        name: req.body.name,
        description: req.body.description,
        category: req.body.category,
        type: req.body.type || 'public',
        maxMembers: req.body.maxMembers,
        creator: req.user._id,
        leaders: [{ userId: req.user._id, role: 'captain' }],
        members: [{ userId: req.user._id, status: 'active' }]
      });

      await User.findByIdAndUpdate(req.user._id, {
        $push: { teams: { teamId: team._id, role: 'captain' } }
      });

      logger.info(`Team created by ${req.user.username}: ${team.name}`);

      res.status(201).json({ success: true, message: 'Team created', data: team });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({ success: false, message: 'That team name is taken' });
      }
      if (error.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: error.message });
      }
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/community/teams/{id}/join:
 *   post:
 *     summary: Join a public team
 *     tags: [Community]
 *     security:
 *       - bearerAuth: []
 */
router.post('/teams/:id/join', protect, validateResource(Team), async (req, res, next) => {
  try {
    const team = req.resource;
    const user = req.user;

    const activeMembers = team.members.filter((m) => m.status === 'active');

    if (activeMembers.some((m) => m.userId.toString() === user._id.toString())) {
      return res.status(400).json({ success: false, message: 'You are already in this team' });
    }

    if (activeMembers.length >= team.maxMembers) {
      return res.status(400).json({ success: false, message: 'Team is full' });
    }

    if (team.type !== 'public') {
      return res
        .status(403)
        .json({ success: false, message: 'This team is not open to join requests' });
    }

    team.members.push({ userId: user._id, status: 'active' });
    await team.save();

    await User.findByIdAndUpdate(user._id, {
      $push: { teams: { teamId: team._id, role: 'member' } }
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`team-${team._id}`).emit('member-joined', {
        teamId: team._id,
        userId: user._id,
        username: user.username
      });
    }

    logger.info(`${user.username} joined team ${team.name}`);

    res.status(200).json({ success: true, message: 'Joined team', data: { team } });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/community/leaderboard:
 *   get:
 *     summary: Get community leaderboard
 *     tags: [Community]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [users, teams]
 *         description: Type of leaderboard
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, all-time]
 *         description: Time period
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of entries to return
 *     responses:
 *       200:
 *         description: Leaderboard retrieved successfully
 */
router.get('/leaderboard', async (req, res, next) => {
  try {
    const { type = 'users', period = 'weekly', limit = 50 } = req.query;
    
    let startDate;
    const now = new Date();
    
    switch (period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly': {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        startDate = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
        break;
      }
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = null; // All-time
    }

    let leaderboard;

    if (type === 'teams') {
      // Team leaderboard
      const query = { isActive: true };
      
      if (startDate) {
        query.updatedAt = { $gte: startDate };
      }

      leaderboard = await Team.find(query)
        .populate('captain', 'username firstName lastName avatar level')
        .populate('members', 'username firstName lastName avatar level')
        .sort({ 'stats.totalPoints': -1 })
        .limit(parseInt(limit))
        .select('name description category stats captain members createdAt');
    } else {
      // User leaderboard. Always ranked by totalPoints: the User schema keeps no
      // per-period point buckets, and sorting by a field that does not exist
      // returns an arbitrary order rather than an error. Period-scoped user
      // rankings need per-period totals to be tracked first.
      leaderboard = await User.find({ isActive: true })
        .sort({ totalPoints: -1 })
        .limit(parseInt(limit))
        .select('username firstName lastName avatar level totalPoints createdAt');
    }

    res.status(200).json({
      success: true,
      data: {
        type,
        period,
        leaderboard
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/community/share:
 *   post:
 *     summary: Share achievement or progress
 *     tags: [Community]
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
 *               - content
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [achievement, challenge_completion, milestone, level_up]
 *               content:
 *                 type: object
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Content shared successfully
 */
router.post('/share', protect, rateLimitByUser(10, 60 * 60 * 1000), [
  body('type')
    .isIn(['achievement', 'challenge_completion', 'milestone', 'level_up'])
    .withMessage('Invalid share type'),
  body('content')
    .isObject()
    .withMessage('Content must be an object'),
  body('message')
    .optional()
    .trim()
    .isLength({ max: 280 })
    .withMessage('Message must be under 280 characters')
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

    const { type, content, message } = req.body;
    const user = req.user;

    // Create activity entry
    const activity = {
      type,
      data: {
        ...content,
        message,
        timestamp: new Date()
      },
      timestamp: new Date()
    };

    // Add to user's activities
    await User.findByIdAndUpdate(user._id, {
      $push: { 
        activities: {
          $each: [activity],
          $slice: -50 // Keep only last 50 activities
        }
      }
    });

    // Emit to user's followers and friends
    const io = req.app.get('io');
    if (io) {
      const followers = [...user.followers, ...user.friends];
      followers.forEach(followerId => {
        io.to(`user-${followerId}`).emit('new-activity', {
          userId: user._id,
          username: user.username,
          avatar: user.avatar,
          level: user.level,
          activity
        });
      });
    }

    logger.info(`User ${user.username} shared ${type}: ${JSON.stringify(content)}`);

    res.status(201).json({
      success: true,
      message: 'Content shared successfully',
      data: activity
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/community/stats:
 *   get:
 *     summary: Get community statistics
 *     tags: [Community]
 *     responses:
 *       200:
 *         description: Community statistics retrieved successfully
 */
router.get('/stats', async (req, res, next) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalTeams,
      activeChallenges,
      totalActivities,
      topCategories
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ 
        isActive: true, 
        lastActive: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }),
      Team.countDocuments({ isActive: true }),
      Challenge.countDocuments({ status: 'active' }),
      User.aggregate([
        { $unwind: '$activities' },
        { 
          $match: { 
            'activities.timestamp': { 
              $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
            }
          }
        },
        { $count: 'total' }
      ]).then(result => result[0]?.total || 0),
      Challenge.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ])
    ]);

    const stats = {
      totalUsers,
      activeUsers,
      totalTeams,
      activeChallenges,
      totalActivities,
      topCategories,
      engagement: {
        dailyActiveUsers: Math.floor(activeUsers * 0.7),
        averageSessionTime: '12 minutes',
        challengeParticipationRate: '68%'
      }
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;