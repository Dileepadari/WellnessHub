const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect, rateLimitByUser } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * /api/wealth/financial-profile:
 *   get:
 *     summary: Get user's financial profile
 *     tags: [Wealth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Financial profile retrieved successfully
 */
router.get('/financial-profile', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('wealthProfile financialGoals preferences.wealth');

    if (!user.wealthProfile) {
      return res.status(404).json({
        success: false,
        message: 'Financial profile not found. Please complete your financial assessment.'
      });
    }

    // Calculate financial health score
    const financialScore = calculateFinancialHealthScore(user.wealthProfile);

    res.status(200).json({
      success: true,
      data: {
        profile: user.wealthProfile,
        goals: user.financialGoals,
        preferences: user.preferences?.wealth,
        healthScore: financialScore
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/wealth/financial-profile:
 *   post:
 *     summary: Update financial profile
 *     tags: [Wealth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               monthlyIncome:
 *                 type: number
 *               monthlyExpenses:
 *                 type: number
 *               currentSavings:
 *                 type: number
 *               monthlyInvestments:
 *                 type: number
 *               debts:
 *                 type: array
 *               riskTolerance:
 *                 type: string
 *               investmentExperience:
 *                 type: string
 *     responses:
 *       200:
 *         description: Financial profile updated successfully
 */
router.post('/financial-profile', protect, rateLimitByUser(10, 60 * 60 * 1000), [
  body('monthlyIncome')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Monthly income must be a positive number'),
  body('monthlyExpenses')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Monthly expenses must be a positive number'),
  body('currentSavings')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Current savings must be a positive number'),
  body('monthlyInvestments')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Monthly investments must be a positive number'),
  body('riskTolerance')
    .optional()
    .isIn(['conservative', 'moderate', 'aggressive'])
    .withMessage('Invalid risk tolerance'),
  body('investmentExperience')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced', 'expert'])
    .withMessage('Invalid investment experience level')
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

    const updateData = {
      'wealthProfile.monthlyIncome': req.body.monthlyIncome,
      'wealthProfile.monthlyExpenses': req.body.monthlyExpenses,
      'wealthProfile.currentSavings': req.body.currentSavings,
      'wealthProfile.monthlyInvestments': req.body.monthlyInvestments,
      'wealthProfile.debts': req.body.debts,
      'wealthProfile.riskTolerance': req.body.riskTolerance,
      'wealthProfile.investmentExperience': req.body.investmentExperience,
      'wealthProfile.lastUpdated': new Date()
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('wealthProfile');

    // Award points for updating financial profile
    await req.user.addPoints(50, 'Updated financial profile');

    // Calculate new financial health score
    const financialScore = calculateFinancialHealthScore(user.wealthProfile);

    logger.info(`User ${req.user.username} updated financial profile`);

    res.status(200).json({
      success: true,
      message: 'Financial profile updated successfully',
      data: {
        profile: user.wealthProfile,
        healthScore: financialScore,
        pointsEarned: 50
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/wealth/goals:
 *   get:
 *     summary: Get financial goals
 *     tags: [Wealth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Financial goals retrieved successfully
 */
router.get('/goals', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('financialGoals wealthProfile.currentSavings');

    const goals = user.financialGoals || [];
    
    // Calculate progress for each goal
    const goalsWithProgress = goals.map(goal => {
      const progress = calculateGoalProgress(goal, user.wealthProfile?.currentSavings || 0);
      return {
        ...goal.toObject(),
        progress
      };
    });

    res.status(200).json({
      success: true,
      data: goalsWithProgress
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/wealth/goals:
 *   post:
 *     summary: Create a new financial goal
 *     tags: [Wealth]
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
 *               - targetAmount
 *               - targetDate
 *               - category
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               targetAmount:
 *                 type: number
 *               currentAmount:
 *                 type: number
 *               targetDate:
 *                 type: string
 *                 format: date
 *               category:
 *                 type: string
 *               priority:
 *                 type: string
 *     responses:
 *       201:
 *         description: Financial goal created successfully
 */
router.post('/goals', protect, rateLimitByUser(20, 24 * 60 * 60 * 1000), [
  body('title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
  body('targetAmount')
    .isFloat({ min: 1 })
    .withMessage('Target amount must be greater than 0'),
  body('currentAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Current amount must be 0 or greater'),
  body('targetDate')
    .isISO8601()
    .toDate()
    .withMessage('Invalid target date'),
  body('category')
    .isIn(['emergency_fund', 'investment', 'debt_payoff', 'major_purchase', 'retirement', 'vacation', 'education', 'other'])
    .withMessage('Invalid category'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Invalid priority level')
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

    const goalData = {
      ...req.body,
      currentAmount: req.body.currentAmount || 0,
      priority: req.body.priority || 'medium',
      createdAt: new Date(),
      isActive: true
    };

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $push: { financialGoals: goalData } },
      { new: true, runValidators: true }
    ).select('financialGoals');

    const newGoal = user.financialGoals[user.financialGoals.length - 1];
    
    // Award points for setting financial goal
    await req.user.addPoints(30, `Set financial goal: ${goalData.title}`);

    logger.info(`User ${req.user.username} created financial goal: ${goalData.title}`);

    res.status(201).json({
      success: true,
      message: 'Financial goal created successfully',
      data: {
        goal: newGoal,
        pointsEarned: 30
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/wealth/goals/{goalId}/progress:
 *   post:
 *     summary: Update goal progress
 *     tags: [Wealth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: goalId
 *         required: true
 *         schema:
 *           type: string
 *         description: Goal ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Goal progress updated successfully
 */
router.post('/goals/:goalId/progress', protect, [
  body('amount')
    .isFloat({ min: 0 })
    .withMessage('Amount must be 0 or greater'),
  body('note')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Note must be under 200 characters')
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

    const { goalId } = req.params;
    const { amount, note } = req.body;

    const user = await User.findOneAndUpdate(
      { 
        _id: req.user._id, 
        'financialGoals._id': goalId 
      },
      { 
        $set: { 
          'financialGoals.$.currentAmount': amount,
          'financialGoals.$.lastUpdated': new Date()
        },
        $push: {
          'financialGoals.$.progressHistory': {
            amount,
            note,
            timestamp: new Date()
          }
        }
      },
      { 
        new: true, 
        runValidators: true 
      }
    ).select('financialGoals');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found'
      });
    }

    const updatedGoal = user.financialGoals.id(goalId);
    const progress = (updatedGoal.currentAmount / updatedGoal.targetAmount) * 100;
    
    // Award points based on progress
    let pointsEarned = 0;
    if (progress >= 100) {
      pointsEarned = 200; // Goal completed
      await req.user.addPoints(pointsEarned, `Completed financial goal: ${updatedGoal.title}`);
    } else if (progress >= 75) {
      pointsEarned = 50; // 75% milestone
      await req.user.addPoints(pointsEarned, `75% progress on: ${updatedGoal.title}`);
    } else if (progress >= 50) {
      pointsEarned = 30; // 50% milestone
      await req.user.addPoints(pointsEarned, `50% progress on: ${updatedGoal.title}`);
    } else if (progress >= 25) {
      pointsEarned = 20; // 25% milestone
      await req.user.addPoints(pointsEarned, `25% progress on: ${updatedGoal.title}`);
    } else {
      pointsEarned = 10; // Progress update
      await req.user.addPoints(pointsEarned, `Updated progress on: ${updatedGoal.title}`);
    }

    // Emit real-time update
    const io = req.app.get('io');
    if (io && progress >= 100) {
      io.to(`user-${req.user._id}`).emit('goal-completed', {
        goalId: updatedGoal._id,
        title: updatedGoal.title,
        points: pointsEarned
      });
    }

    logger.info(`User ${req.user.username} updated goal progress: ${updatedGoal.title} - ${progress.toFixed(1)}%`);

    res.status(200).json({
      success: true,
      message: progress >= 100 ? 'Goal completed! Congratulations!' : 'Goal progress updated successfully',
      data: {
        goal: updatedGoal,
        progress: Math.round(progress),
        pointsEarned,
        completed: progress >= 100
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/wealth/investments:
 *   get:
 *     summary: Get investment portfolio
 *     tags: [Wealth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Investment portfolio retrieved successfully
 */
router.get('/investments', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('wealthProfile.investments wealthProfile.portfolioValue wealthProfile.riskTolerance');

    const investments = user.wealthProfile?.investments || [];
    const portfolioValue = user.wealthProfile?.portfolioValue || 0;
    const riskTolerance = user.wealthProfile?.riskTolerance || 'moderate';

    // Generate investment insights based on portfolio
    const insights = generateInvestmentInsights(investments, riskTolerance);

    res.status(200).json({
      success: true,
      data: {
        investments,
        portfolioValue,
        riskTolerance,
        insights
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/wealth/insights:
 *   get:
 *     summary: Get personalized financial insights
 *     tags: [Wealth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Financial insights retrieved successfully
 */
router.get('/insights', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('wealthProfile financialGoals');

    if (!user.wealthProfile) {
      return res.status(404).json({
        success: false,
        message: 'Please complete your financial profile to get insights'
      });
    }

    const insights = generateFinancialInsights(user.wealthProfile, user.financialGoals);

    res.status(200).json({
      success: true,
      data: insights
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/wealth/budget:
 *   get:
 *     summary: Get budget analysis
 *     tags: [Wealth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Budget analysis retrieved successfully
 */
router.get('/budget', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('wealthProfile.monthlyIncome wealthProfile.monthlyExpenses wealthProfile.monthlyInvestments');

    const { monthlyIncome, monthlyExpenses, monthlyInvestments } = user.wealthProfile || {};

    if (!monthlyIncome || !monthlyExpenses) {
      return res.status(404).json({
        success: false,
        message: 'Please update your financial profile with income and expenses'
      });
    }

    const budgetAnalysis = {
      income: monthlyIncome,
      expenses: monthlyExpenses,
      investments: monthlyInvestments || 0,
      savings: monthlyIncome - monthlyExpenses - (monthlyInvestments || 0),
      savingsRate: ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100,
      investmentRate: ((monthlyInvestments || 0) / monthlyIncome) * 100,
      recommendations: generateBudgetRecommendations(monthlyIncome, monthlyExpenses, monthlyInvestments)
    };

    res.status(200).json({
      success: true,
      data: budgetAnalysis
    });
  } catch (error) {
    next(error);
  }
});

// Helper functions
function calculateFinancialHealthScore(wealthProfile) {
  if (!wealthProfile) return 0;
  
  let score = 0;
  const { monthlyIncome, monthlyExpenses, currentSavings, monthlyInvestments, debts } = wealthProfile;
  
  // Savings rate (30 points max)
  if (monthlyIncome && monthlyExpenses) {
    const savingsRate = ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100;
    score += Math.min(savingsRate * 1.5, 30);
  }
  
  // Emergency fund (25 points max)
  if (currentSavings && monthlyExpenses) {
    const monthsOfExpenses = currentSavings / monthlyExpenses;
    score += Math.min(monthsOfExpenses * 4, 25);
  }
  
  // Investment rate (25 points max)
  if (monthlyInvestments && monthlyIncome) {
    const investmentRate = (monthlyInvestments / monthlyIncome) * 100;
    score += Math.min(investmentRate * 2.5, 25);
  }
  
  // Debt burden (20 points max, deducted)
  if (debts && debts.length > 0 && monthlyIncome) {
    const totalDebt = debts.reduce((sum, debt) => sum + debt.amount, 0);
    const debtToIncomeRatio = (totalDebt / (monthlyIncome * 12)) * 100;
    score -= Math.min(debtToIncomeRatio * 0.5, 20);
  } else {
    score += 20; // No debt bonus
  }
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

function calculateGoalProgress(goal, currentSavings) {
  const progress = (goal.currentAmount / goal.targetAmount) * 100;
  const daysRemaining = Math.ceil((new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24));
  
  return {
    percentage: Math.min(100, Math.round(progress)),
    amount: goal.currentAmount,
    remaining: goal.targetAmount - goal.currentAmount,
    daysRemaining: Math.max(0, daysRemaining),
    onTrack: progress >= ((new Date() - new Date(goal.createdAt)) / (new Date(goal.targetDate) - new Date(goal.createdAt))) * 100
  };
}

function generateInvestmentInsights(investments, riskTolerance) {
  const insights = [];
  
  if (investments.length === 0) {
    insights.push({
      type: 'suggestion',
      title: 'Start Investing',
      message: 'Consider starting your investment journey with index funds for diversification.'
    });
  }
  
  // Add more investment insights based on portfolio composition
  insights.push({
    type: 'tip',
    title: 'Diversification',
    message: `Based on your ${riskTolerance} risk tolerance, consider diversifying across different asset classes.`
  });
  
  return insights;
}

function generateFinancialInsights(wealthProfile, financialGoals) {
  const insights = [];
  const { monthlyIncome, monthlyExpenses, currentSavings } = wealthProfile;
  
  // Savings rate insight
  if (monthlyIncome && monthlyExpenses) {
    const savingsRate = ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100;
    if (savingsRate < 10) {
      insights.push({
        type: 'warning',
        title: 'Low Savings Rate',
        message: 'Try to save at least 20% of your income for long-term financial health.'
      });
    } else {
      insights.push({
        type: 'success',
        title: 'Good Savings Rate',
        message: `Your ${savingsRate.toFixed(1)}% savings rate is on track for financial success!`
      });
    }
  }
  
  // Emergency fund insight
  if (currentSavings && monthlyExpenses) {
    const monthsOfExpenses = currentSavings / monthlyExpenses;
    if (monthsOfExpenses < 3) {
      insights.push({
        type: 'suggestion',
        title: 'Build Emergency Fund',
        message: 'Aim to save 3-6 months of expenses for emergencies.'
      });
    }
  }
  
  return insights;
}

function generateBudgetRecommendations(income, expenses, investments) {
  const recommendations = [];
  const savingsRate = ((income - expenses) / income) * 100;
  const investmentRate = ((investments || 0) / income) * 100;
  
  if (savingsRate < 20) {
    recommendations.push({
      type: 'expense',
      title: 'Reduce Expenses',
      message: 'Look for areas to cut spending to increase your savings rate.'
    });
  }
  
  if (investmentRate < 10) {
    recommendations.push({
      type: 'investment',
      title: 'Increase Investments',
      message: 'Consider investing at least 10% of your income for long-term growth.'
    });
  }
  
  return recommendations;
}

module.exports = router;