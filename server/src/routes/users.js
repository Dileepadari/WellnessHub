const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect, rateLimitByUser } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Not authorized
 */
router.get('/profile', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('achievements.achievementId', 'title description icon points rarity category')
      .populate('teams.teamId', 'name avatar category stats')
      .populate('activeChallenges.challengeId', 'title category points endDate difficulty');

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               phoneNumber:
 *                 type: string
 *               avatar:
 *                 type: string
 *               healthMetrics:
 *                 type: object
 *               financialMetrics:
 *                 type: object
 *               preferences:
 *                 type: object
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authorized
 */
router.put('/profile', protect, [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name cannot exceed 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name cannot exceed 50 characters'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date of birth'),
  body('phoneNumber')
    .optional()
    .matches(/^\+?[\d\s-()]+$/)
    .withMessage('Please provide a valid phone number'),
  body('healthMetrics.height')
    .optional()
    .isNumeric()
    .withMessage('Height must be a number'),
  body('healthMetrics.weight')
    .optional()
    .isNumeric()
    .withMessage('Weight must be a number')
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

    const allowedUpdates = [
      'firstName', 'lastName', 'dateOfBirth', 'phoneNumber', 'avatar',
      'healthMetrics', 'financialMetrics', 'preferences'
    ];

    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Special handling for nested objects
    if (req.body.healthMetrics) {
      updates.healthMetrics = { ...req.user.healthMetrics, ...req.body.healthMetrics };
    }
    if (req.body.financialMetrics) {
      updates.financialMetrics = { ...req.user.financialMetrics, ...req.body.financialMetrics };
    }
    if (req.body.preferences) {
      updates.preferences = { ...req.user.preferences, ...req.body.preferences };
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    );

    logger.info(`Profile updated for user: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/users/stats:
 *   get:
 *     summary: Get user statistics
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User statistics retrieved successfully
 */
router.get('/stats', protect, async (req, res, next) => {
  try {
    const user = req.user;
    
    const stats = {
      level: user.level,
      experience: user.experience,
      totalPoints: user.totalPoints,
      availablePoints: user.availablePoints,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      achievementsCount: user.achievements.length,
      activeChallengesCount: user.activeChallenges.filter(c => !c.completed).length,
      completedChallengesCount: user.activeChallenges.filter(c => c.completed).length,
      teamsCount: user.teams.length,
      friendsCount: user.friends.length,
      followersCount: user.followers.length,
      levelProgress: user.levelProgress,
      xpForNextLevel: user.xpForNextLevel,
      rank: await User.getUserRank(user._id, 'totalPoints')
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/users/leaderboard:
 *   get:
 *     summary: Get user leaderboard
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [totalPoints, level, currentStreak]
 *         description: Leaderboard category
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
    const { category = 'totalPoints', limit = 10 } = req.query;
    const validCategories = ['totalPoints', 'level', 'currentStreak'];
    
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid leaderboard category'
      });
    }

    const leaderboard = await User.getLeaderboard(parseInt(limit), category);

    res.status(200).json({
      success: true,
      data: {
        category,
        users: leaderboard
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/users/search:
 *   get:
 *     summary: Search users
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *         description: Number of users to return
 *     responses:
 *       200:
 *         description: Users found
 *       400:
 *         description: Search query required
 */
router.get('/search', async (req, res, next) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    const users = await User.find({
      $and: [
        { isActive: true },
        {
          $or: [
            { username: { $regex: q.trim(), $options: 'i' } },
            { firstName: { $regex: q.trim(), $options: 'i' } },
            { lastName: { $regex: q.trim(), $options: 'i' } }
          ]
        }
      ]
    })
    .select('username firstName lastName avatar level totalPoints currentStreak')
    .limit(parseInt(limit))
    .sort({ totalPoints: -1 });

    res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User found
 *       404:
 *         description: User not found
 */
router.get('/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('username firstName lastName avatar level totalPoints currentStreak achievements teams')
      .populate('achievements.achievementId', 'title description icon rarity')
      .populate('teams.teamId', 'name avatar category');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check privacy settings
    if (user.preferences?.privacy?.profileVisibility === 'private') {
      return res.status(403).json({
        success: false,
        message: 'This profile is private'
      });
    }

    // Filter data based on privacy settings
    const publicData = {
      _id: user._id,
      username: user.username,
      avatar: user.avatar,
      level: user.level,
      totalPoints: user.totalPoints,
      currentStreak: user.currentStreak
    };

    // Add more data if profile is public or user is viewing their own profile
    if (user.preferences?.privacy?.profileVisibility === 'public' || 
        (req.user && req.user._id.toString() === user._id.toString())) {
      publicData.firstName = user.preferences?.privacy?.showRealName ? user.firstName : undefined;
      publicData.lastName = user.preferences?.privacy?.showRealName ? user.lastName : undefined;
      publicData.achievements = user.preferences?.privacy?.showAchievements ? user.achievements : [];
      publicData.teams = user.teams;
    }

    res.status(200).json({
      success: true,
      data: publicData
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/users/friends:
 *   get:
 *     summary: Get user's friends
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Friends list retrieved
 */
router.get('/friends', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('friends', 'username firstName lastName avatar level totalPoints currentStreak lastActivityDate')
      .populate('followedUsers', 'username firstName lastName avatar level totalPoints currentStreak');

    res.status(200).json({
      success: true,
      data: {
        friends: user.friends,
        following: user.followedUsers,
        followers: user.followers.length // Don't populate followers for privacy
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/users/friends/{id}:
 *   post:
 *     summary: Add friend
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to add as friend
 *     responses:
 *       200:
 *         description: Friend added successfully
 *       400:
 *         description: Cannot add yourself or already friends
 *       404:
 *         description: User not found
 */
router.post('/friends/:id', protect, rateLimitByUser(10, 15 * 60 * 1000), async (req, res, next) => {
  try {
    const friendId = req.params.id;
    const userId = req.user._id;

    if (friendId === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot add yourself as a friend'
      });
    }

    const friend = await User.findById(friendId);
    if (!friend || !friend.isActive) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if already friends
    if (req.user.friends.includes(friendId)) {
      return res.status(400).json({
        success: false,
        message: 'Already friends with this user'
      });
    }

    // Add to both users' friend lists
    await User.findByIdAndUpdate(userId, {
      $addToSet: { friends: friendId, followedUsers: friendId }
    });

    await User.findByIdAndUpdate(friendId, {
      $addToSet: { friends: userId, followers: userId }
    });

    logger.info(`User ${req.user.username} added ${friend.username} as friend`);

    res.status(200).json({
      success: true,
      message: 'Friend added successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/users/friends/{id}:
 *   delete:
 *     summary: Remove friend
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to remove from friends
 *     responses:
 *       200:
 *         description: Friend removed successfully
 *       404:
 *         description: Friend not found
 */
router.delete('/friends/:id', protect, async (req, res, next) => {
  try {
    const friendId = req.params.id;
    const userId = req.user._id;

    // Remove from both users' friend lists
    await User.findByIdAndUpdate(userId, {
      $pull: { friends: friendId, followedUsers: friendId }
    });

    await User.findByIdAndUpdate(friendId, {
      $pull: { friends: userId, followers: userId }
    });

    logger.info(`User ${req.user.username} removed friend ${friendId}`);

    res.status(200).json({
      success: true,
      message: 'Friend removed successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/users/deactivate:
 *   post:
 *     summary: Deactivate user account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deactivated successfully
 */
router.post('/deactivate', protect, async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      isActive: false,
      updatedAt: new Date()
    });

    logger.info(`User account deactivated: ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Account deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;