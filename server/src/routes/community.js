const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Team = require('../models/Team');
const Challenge = require('../models/Challenge');
const { protect, rateLimitByUser, validateResource, authorize } = require('../middleware/auth');
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
    const followingIds = [...user.following, ...user.friends];
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
 *     summary: Get teams
 *     tags: [Community]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for team names
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of teams to return
 *     responses:
 *       200:
 *         description: Teams retrieved successfully
 */
router.get('/teams', async (req, res, next) => {
  try {
    const { search, category, limit = 20 } = req.query;
    
    let query = { isActive: true, isPublic: true };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) {
      query.category = category;
    }

    const teams = await Team.find(query)
      .populate('captain', 'username firstName lastName avatar level')
      .populate('members', 'username firstName lastName avatar level')
      .sort({ 'stats.totalPoints': -1, createdAt: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: teams
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/community/teams:
 *   post:
 *     summary: Create a new team
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
 *               - name
 *               - description
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               isPublic:
 *                 type: boolean
 *               maxMembers:
 *                 type: number
 *     responses:
 *       201:
 *         description: Team created successfully
 */
router.post('/teams', protect, rateLimitByUser(3, 24 * 60 * 60 * 1000), [
  body('name')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Team name must be between 3 and 50 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage('Description must be between 10 and 200 characters'),
  body('category')
    .optional()
    .isIn(['health', 'wealth', 'insurance', 'wellness', 'general'])
    .withMessage('Invalid category'),
  body('maxMembers')
    .optional()
    .isInt({ min: 2, max: 50 })
    .withMessage('Max members must be between 2 and 50')
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

    // Check if user is already captain of another team
    const existingTeam = await Team.findOne({ 
      captain: req.user._id, 
      isActive: true 
    });

    if (existingTeam) {
      return res.status(400).json({
        success: false,
        message: 'You can only be captain of one team at a time'
      });
    }

    const teamData = {
      ...req.body,
      captain: req.user._id,
      members: [req.user._id],
      stats: {
        totalMembers: 1,
        totalPoints: 0,
        activeChallenges: 0,
        completedChallenges: 0
      }
    };

    const team = await Team.create(teamData);
    await team.populate('captain', 'username firstName lastName avatar level');

    // Update user's team membership
    await User.findByIdAndUpdate(req.user._id, {
      $set: { currentTeam: team._id }
    });

    logger.info(`Team created by ${req.user.username}: ${team.name}`);

    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      data: team
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/community/teams/{id}/join:
 *   post:
 *     summary: Join a team
 *     tags: [Community]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Team ID
 *     responses:
 *       200:
 *         description: Successfully joined team
 */
router.post('/teams/:id/join', protect, validateResource(Team), async (req, res, next) => {
  try {
    const team = req.resource;
    const user = req.user;

    // Check if user is already in a team
    if (user.currentTeam) {
      return res.status(400).json({
        success: false,
        message: 'You are already a member of another team'
      });
    }

    // Check if team is full
    if (team.members.length >= team.maxMembers) {
      return res.status(400).json({
        success: false,
        message: 'Team is full'
      });
    }

    // Check if team is public or user was invited
    if (!team.isPublic && !team.invitedUsers.includes(user._id)) {
      return res.status(403).json({
        success: false,
        message: 'This team is private and requires an invitation'
      });
    }

    // Add user to team
    await team.addMember(user._id);

    // Update user's team membership
    await User.findByIdAndUpdate(user._id, {
      $set: { currentTeam: team._id }
    });

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`team-${team._id}`).emit('member-joined', {
        userId: user._id,
        username: user.username,
        avatar: user.avatar,
        level: user.level,
        totalMembers: team.members.length + 1
      });
    }

    logger.info(`User ${user.username} joined team: ${team.name}`);

    res.status(200).json({
      success: true,
      message: 'Successfully joined team',
      data: {
        teamId: team._id,
        teamName: team.name,
        memberCount: team.members.length + 1
      }
    });
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
      case 'weekly':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        startDate = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = null; // All-time
    }

    let leaderboard;

    if (type === 'teams') {
      // Team leaderboard
      let query = { isActive: true };
      
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
      // User leaderboard
      let sortField = 'totalPoints';
      let query = { isActive: true };

      if (period === 'daily') {
        sortField = 'dailyPoints';
      } else if (period === 'weekly') {
        sortField = 'weeklyPoints';
      } else if (period === 'monthly') {
        sortField = 'monthlyPoints';
      }

      leaderboard = await User.find(query)
        .sort({ [sortField]: -1 })
        .limit(parseInt(limit))
        .select('username firstName lastName avatar level totalPoints dailyPoints weeklyPoints monthlyPoints createdAt');
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