const express = require('express');
const User = require('../models/User');
const Challenge = require('../models/Challenge');
const Team = require('../models/Team');
const { protect, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     summary: Get analytics dashboard data
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard analytics retrieved successfully
 */
router.get('/dashboard', protect, async (req, res, next) => {
  try {
    const user = req.user;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // User's personal analytics
    const personalStats = {
      totalPoints: user.totalPoints,
      currentLevel: user.level,
      progressToNextLevel: ((user.totalPoints % 1000) / 1000) * 100,
      currentStreak: user.streakCount,
      longestStreak: user.longestStreak,
      totalAchievements: user.achievements?.length || 0,
      activeChallenges: user.activeChallenges?.length || 0
    };

    // Health analytics
    const healthActivities = user.healthActivities || [];
    const recentHealthActivities = healthActivities.filter(
      activity => new Date(activity.date) >= sevenDaysAgo
    );

    const healthStats = {
      totalActivities: healthActivities.length,
      weeklyActivities: recentHealthActivities.length,
      averageStepsPerDay: calculateAverageSteps(recentHealthActivities),
      workoutsThisWeek: recentHealthActivities.filter(a => a.type === 'workout').length,
      waterIntakeAverage: calculateAverageWaterIntake(recentHealthActivities)
    };

    // Wealth analytics
    const wealthProfile = user.wealthProfile || {};
    const financialGoals = user.financialGoals || [];
    const activeGoals = financialGoals.filter(goal => goal.isActive);
    
    const wealthStats = {
      totalSavings: wealthProfile.currentSavings || 0,
      monthlyIncome: wealthProfile.monthlyIncome || 0,
      savingsRate: calculateSavingsRate(wealthProfile),
      activeGoals: activeGoals.length,
      goalsCompleted: financialGoals.filter(goal => {
        const progress = (goal.currentAmount / goal.targetAmount) * 100;
        return progress >= 100;
      }).length
    };

    // Insurance analytics
    const insuranceProfile = user.insuranceProfile || {};
    const policies = insuranceProfile.policies || [];
    
    const insuranceStats = {
      totalPolicies: policies.length,
      totalCoverage: policies.reduce((sum, policy) => sum + (policy.coverageAmount || 0), 0),
      totalPremiums: policies.reduce((sum, policy) => sum + (policy.annualPremium || 0), 0),
      coverageScore: calculateInsuranceCoverageScore(insuranceProfile)
    };

    // Activity trends (last 30 days)
    const activityTrends = await generateActivityTrends(user._id, thirtyDaysAgo);

    // Leaderboard position
    const leaderboardPosition = await getUserLeaderboardPosition(user._id);

    const dashboardData = {
      personalStats,
      healthStats,
      wealthStats,
      insuranceStats,
      activityTrends,
      leaderboardPosition,
      generatedAt: new Date()
    };

    res.status(200).json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/analytics/trends:
 *   get:
 *     summary: Get user activity trends
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *         description: Time period for trends
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [health, wealth, insurance, gamification]
 *         description: Category to analyze
 *     responses:
 *       200:
 *         description: Activity trends retrieved successfully
 */
router.get('/trends', protect, async (req, res, next) => {
  try {
    const { period = '30d', category } = req.query;
    const user = req.user;

    let startDate;
    const now = new Date();

    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const trends = await generateDetailedTrends(user._id, startDate, category);

    res.status(200).json({
      success: true,
      data: {
        period,
        category,
        startDate,
        endDate: now,
        trends
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/analytics/achievements:
 *   get:
 *     summary: Get achievement analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Achievement analytics retrieved successfully
 */
router.get('/achievements', protect, async (req, res, next) => {
  try {
    const user = req.user;
    const achievements = user.achievements || [];

    // Group achievements by category
    const achievementsByCategory = achievements.reduce((acc, achievement) => {
      const category = achievement.category || 'general';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(achievement);
      return acc;
    }, {});

    // Recent achievements (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentAchievements = achievements.filter(
      achievement => new Date(achievement.unlockedAt) >= thirtyDaysAgo
    );

    // Achievement progression
    const totalPossibleAchievements = await getTotalPossibleAchievements();
    const completionRate = (achievements.length / totalPossibleAchievements) * 100;

    const analyticsData = {
      totalAchievements: achievements.length,
      recentAchievements: recentAchievements.length,
      achievementsByCategory,
      completionRate: Math.round(completionRate),
      totalPossibleAchievements,
      rareAchievements: achievements.filter(a => a.rarity === 'legendary' || a.rarity === 'epic').length
    };

    res.status(200).json({
      success: true,
      data: analyticsData
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/analytics/engagement:
 *   get:
 *     summary: Get user engagement metrics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Engagement metrics retrieved successfully
 */
router.get('/engagement', protect, async (req, res, next) => {
  try {
    const user = req.user;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Calculate engagement metrics
    const activities = user.activities || [];
    const recentActivities = activities.filter(
      activity => new Date(activity.timestamp) >= thirtyDaysAgo
    );

    // Session data (approximated from activities)
    const sessionData = calculateSessionMetrics(recentActivities);

    // Feature usage
    const featureUsage = analyzeFeatureUsage(user);

    // Social engagement
    const socialMetrics = {
      friendsCount: user.friends?.length || 0,
      followersCount: user.followers?.length || 0,
      followingCount: user.following?.length || 0,
      teamMembership: user.currentTeam ? 1 : 0,
      activitiesShared: recentActivities.length
    };

    const engagementData = {
      dailyActiveStreak: user.streakCount,
      averageSessionLength: sessionData.averageLength,
      sessionsPerWeek: sessionData.weeklyAverage,
      featureUsage,
      socialMetrics,
      lastActiveDate: user.lastActive,
      totalActivities: activities.length,
      monthlyActivities: recentActivities.length
    };

    res.status(200).json({
      success: true,
      data: engagementData
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/analytics/admin/overview:
 *   get:
 *     summary: Get admin analytics overview (Admin only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin analytics retrieved successfully
 *       403:
 *         description: Access denied - Admin only
 */
router.get('/admin/overview', protect, authorize('admin'), async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // User metrics
    const [
      totalUsers,
      newUsersThisMonth,
      activeUsersThisWeek,
      averageLevel
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ 
        isActive: true, 
        createdAt: { $gte: thirtyDaysAgo } 
      }),
      User.countDocuments({ 
        isActive: true, 
        lastActive: { $gte: sevenDaysAgo } 
      }),
      User.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, avgLevel: { $avg: '$level' } } }
      ]).then(result => result[0]?.avgLevel || 0)
    ]);

    // Challenge metrics
    const [
      totalChallenges,
      activeChallenges,
      challengeParticipation
    ] = await Promise.all([
      Challenge.countDocuments({ isActive: true }),
      Challenge.countDocuments({ status: 'active' }),
      Challenge.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, totalParticipants: { $sum: '$stats.totalParticipants' } } }
      ]).then(result => result[0]?.totalParticipants || 0)
    ]);

    // Team metrics
    const [
      totalTeams,
      averageTeamSize
    ] = await Promise.all([
      Team.countDocuments({ isActive: true }),
      Team.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, avgSize: { $avg: '$stats.totalMembers' } } }
      ]).then(result => result[0]?.avgSize || 0)
    ]);

    // Engagement metrics
    const engagementMetrics = await calculatePlatformEngagement(thirtyDaysAgo);

    // Feature adoption
    const featureAdoption = await analyzeFeatureAdoption();

    const adminOverview = {
      userMetrics: {
        totalUsers,
        newUsersThisMonth,
        activeUsersThisWeek,
        averageLevel: Math.round(averageLevel * 10) / 10,
        retentionRate: Math.round((activeUsersThisWeek / totalUsers) * 100)
      },
      challengeMetrics: {
        totalChallenges,
        activeChallenges,
        challengeParticipation,
        averageParticipation: Math.round(challengeParticipation / activeChallenges) || 0
      },
      teamMetrics: {
        totalTeams,
        averageTeamSize: Math.round(averageTeamSize * 10) / 10
      },
      engagementMetrics,
      featureAdoption,
      generatedAt: new Date()
    };

    res.status(200).json({
      success: true,
      data: adminOverview
    });
  } catch (error) {
    next(error);
  }
});

// Helper functions
async function generateActivityTrends(userId, startDate) {
  const user = await User.findById(userId).select('activities healthActivities');
  
  const activities = user.activities || [];
  const healthActivities = user.healthActivities || [];
  
  const trends = {
    dailyPoints: [],
    weeklyActivity: [],
    categoryBreakdown: {}
  };
  
  // Generate daily points trend
  const days = Math.ceil((new Date() - startDate) / (1000 * 60 * 60 * 24));
  for (let i = days; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dayActivities = activities.filter(activity => 
      new Date(activity.timestamp).toDateString() === date.toDateString()
    );
    
    trends.dailyPoints.push({
      date: date.toISOString().split('T')[0],
      points: dayActivities.reduce((sum, activity) => 
        sum + (activity.data?.points || 0), 0
      )
    });
  }
  
  return trends;
}

async function getUserLeaderboardPosition(userId) {
  const position = await User.countDocuments({
    isActive: true,
    totalPoints: { $gt: (await User.findById(userId)).totalPoints }
  });
  
  return position + 1;
}

function calculateSavingsRate(wealthProfile) {
  const { monthlyIncome, monthlyExpenses } = wealthProfile;
  if (!monthlyIncome || !monthlyExpenses) return 0;
  
  return Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100);
}

function calculateAverageSteps(activities) {
  const stepActivities = activities.filter(a => a.type === 'steps' && a.value);
  if (stepActivities.length === 0) return 0;
  
  const totalSteps = stepActivities.reduce((sum, activity) => sum + activity.value, 0);
  return Math.round(totalSteps / stepActivities.length);
}

function calculateAverageWaterIntake(activities) {
  const waterActivities = activities.filter(a => a.type === 'water' && a.value);
  if (waterActivities.length === 0) return 0;
  
  const totalWater = waterActivities.reduce((sum, activity) => sum + activity.value, 0);
  return Math.round((totalWater / waterActivities.length) * 10) / 10;
}

function calculateInsuranceCoverageScore(insuranceProfile) {
  // Simplified version of the function from insurance routes
  if (!insuranceProfile || !insuranceProfile.policies) return 0;
  
  const policies = insuranceProfile.policies;
  const essentialTypes = ['health', 'auto', 'life'];
  const existingTypes = new Set(policies.map(p => p.type));
  
  let score = 0;
  essentialTypes.forEach(type => {
    if (existingTypes.has(type)) {
      score += type === 'health' ? 40 : 30;
    }
  });
  
  return Math.min(100, score);
}

async function getTotalPossibleAchievements() {
  // This would typically be stored in a database or configuration
  // For now, return a hardcoded value
  return 50;
}

function calculateSessionMetrics(activities) {
  // Approximate session data from activities
  const daysWithActivity = new Set(
    activities.map(a => new Date(a.timestamp).toDateString())
  ).size;
  
  return {
    averageLength: '12 minutes', // Placeholder
    weeklyAverage: Math.round((daysWithActivity / 4) * 10) / 10
  };
}

function analyzeFeatureUsage(user) {
  return {
    healthTracking: (user.healthActivities?.length || 0) > 0,
    wealthManagement: !!(user.wealthProfile?.monthlyIncome),
    insuranceManagement: (user.insuranceProfile?.policies?.length || 0) > 0,
    socialFeatures: (user.friends?.length || 0) > 0,
    challenges: (user.activeChallenges?.length || 0) > 0,
    teamParticipation: !!user.currentTeam
  };
}

async function calculatePlatformEngagement(startDate) {
  const totalUsers = await User.countDocuments({ isActive: true });
  const activeUsers = await User.countDocuments({
    isActive: true,
    lastActive: { $gte: startDate }
  });
  
  return {
    dailyActiveUsers: Math.round(activeUsers * 0.7), // Approximation
    weeklyActiveUsers: activeUsers,
    monthlyActiveUsers: totalUsers,
    averageSessionDuration: '12 minutes',
    bounceRate: '25%'
  };
}

async function analyzeFeatureAdoption() {
  const [
    usersWithHealth,
    usersWithWealth,
    usersWithInsurance,
    usersWithTeam
  ] = await Promise.all([
    User.countDocuments({ 'healthActivities.0': { $exists: true } }),
    User.countDocuments({ 'wealthProfile.monthlyIncome': { $exists: true } }),
    User.countDocuments({ 'insuranceProfile.policies.0': { $exists: true } }),
    User.countDocuments({ currentTeam: { $exists: true, $ne: null } })
  ]);
  
  const totalUsers = await User.countDocuments({ isActive: true });
  
  return {
    healthTracking: Math.round((usersWithHealth / totalUsers) * 100),
    wealthManagement: Math.round((usersWithWealth / totalUsers) * 100),
    insuranceManagement: Math.round((usersWithInsurance / totalUsers) * 100),
    teamParticipation: Math.round((usersWithTeam / totalUsers) * 100)
  };
}

async function generateDetailedTrends(userId, startDate, category) {
  const user = await User.findById(userId);
  
  // This would be expanded based on the category filter
  const trends = {
    pointsOverTime: [],
    activityFrequency: [],
    categoryPerformance: {}
  };
  
  // Generate time-series data based on category
  if (!category || category === 'gamification') {
    // Add gamification trends
  }
  
  if (!category || category === 'health') {
    // Add health trends
  }
  
  if (!category || category === 'wealth') {
    // Add wealth trends
  }
  
  if (!category || category === 'insurance') {
    // Add insurance trends
  }
  
  return trends;
}

module.exports = router;