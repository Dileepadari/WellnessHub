const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect, rateLimitByUser } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * /api/insurance/profile:
 *   get:
 *     summary: Get user's insurance profile
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Insurance profile retrieved successfully
 */
router.get('/profile', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('insuranceProfile preferences.insurance');

    if (!user.insuranceProfile) {
      return res.status(404).json({
        success: false,
        message: 'Insurance profile not found. Please complete your insurance assessment.'
      });
    }

    // Calculate insurance coverage score
    const coverageScore = calculateInsuranceCoverageScore(user.insuranceProfile);

    res.status(200).json({
      success: true,
      data: {
        profile: user.insuranceProfile,
        preferences: user.preferences?.insurance,
        coverageScore
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/insurance/profile:
 *   post:
 *     summary: Update insurance profile
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               age:
 *                 type: number
 *               annualIncome:
 *                 type: number
 *               dependents:
 *                 type: number
 *               healthConditions:
 *                 type: array
 *               lifestyle:
 *                 type: string
 *               occupation:
 *                 type: string
 *               assets:
 *                 type: array
 *     responses:
 *       200:
 *         description: Insurance profile updated successfully
 */
router.post('/profile', protect, rateLimitByUser(10, 60 * 60 * 1000), [
  body('age')
    .optional()
    .isInt({ min: 18, max: 100 })
    .withMessage('Age must be between 18 and 100'),
  body('annualIncome')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Annual income must be a positive number'),
  body('dependents')
    .optional()
    .isInt({ min: 0, max: 20 })
    .withMessage('Number of dependents must be between 0 and 20'),
  body('lifestyle')
    .optional()
    .isIn(['sedentary', 'active', 'very_active', 'high_risk'])
    .withMessage('Invalid lifestyle category'),
  body('occupation')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Occupation must be between 2 and 100 characters')
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
      'insuranceProfile.age': req.body.age,
      'insuranceProfile.annualIncome': req.body.annualIncome,
      'insuranceProfile.dependents': req.body.dependents,
      'insuranceProfile.healthConditions': req.body.healthConditions,
      'insuranceProfile.lifestyle': req.body.lifestyle,
      'insuranceProfile.occupation': req.body.occupation,
      'insuranceProfile.assets': req.body.assets,
      'insuranceProfile.lastUpdated': new Date()
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
    ).select('insuranceProfile');

    // Award points for updating insurance profile
    await req.user.addPoints(50, 'Updated insurance profile');

    // Calculate new coverage score
    const coverageScore = calculateInsuranceCoverageScore(user.insuranceProfile);

    logger.info(`User ${req.user.username} updated insurance profile`);

    res.status(200).json({
      success: true,
      message: 'Insurance profile updated successfully',
      data: {
        profile: user.insuranceProfile,
        coverageScore,
        pointsEarned: 50
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/insurance/policies:
 *   get:
 *     summary: Get user's insurance policies
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Insurance policies retrieved successfully
 */
router.get('/policies', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('insuranceProfile.policies');

    const policies = user.insuranceProfile?.policies || [];
    
    // Calculate total coverage and premiums
    const totalCoverage = policies.reduce((sum, policy) => sum + (policy.coverageAmount || 0), 0);
    const totalPremiums = policies.reduce((sum, policy) => sum + (policy.annualPremium || 0), 0);
    
    // Group policies by type
    const policiesByType = policies.reduce((acc, policy) => {
      if (!acc[policy.type]) {
        acc[policy.type] = [];
      }
      acc[policy.type].push(policy);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        policies,
        summary: {
          totalPolicies: policies.length,
          totalCoverage,
          totalPremiums,
          policiesByType
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/insurance/policies:
 *   post:
 *     summary: Add a new insurance policy
 *     tags: [Insurance]
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
 *               - provider
 *               - policyNumber
 *               - coverageAmount
 *               - annualPremium
 *             properties:
 *               type:
 *                 type: string
 *               provider:
 *                 type: string
 *               policyNumber:
 *                 type: string
 *               coverageAmount:
 *                 type: number
 *               annualPremium:
 *                 type: number
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               beneficiaries:
 *                 type: array
 *     responses:
 *       201:
 *         description: Insurance policy added successfully
 */
router.post('/policies', protect, rateLimitByUser(20, 24 * 60 * 60 * 1000), [
  body('type')
    .isIn(['life', 'health', 'auto', 'home', 'disability', 'travel', 'umbrella', 'pet'])
    .withMessage('Invalid insurance type'),
  body('provider')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Provider name must be between 2 and 100 characters'),
  body('policyNumber')
    .trim()
    .isLength({ min: 5, max: 50 })
    .withMessage('Policy number must be between 5 and 50 characters'),
  body('coverageAmount')
    .isFloat({ min: 1 })
    .withMessage('Coverage amount must be greater than 0'),
  body('annualPremium')
    .isFloat({ min: 0 })
    .withMessage('Annual premium must be 0 or greater'),
  body('startDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Invalid start date'),
  body('endDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Invalid end date')
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

    const policyData = {
      ...req.body,
      addedAt: new Date(),
      isActive: true
    };

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $push: { 'insuranceProfile.policies': policyData } },
      { new: true, runValidators: true }
    ).select('insuranceProfile.policies');

    const newPolicy = user.insuranceProfile.policies[user.insuranceProfile.policies.length - 1];
    
    // Award points for adding insurance policy
    await req.user.addPoints(75, `Added ${req.body.type} insurance policy`);

    logger.info(`User ${req.user.username} added ${req.body.type} insurance policy`);

    res.status(201).json({
      success: true,
      message: 'Insurance policy added successfully',
      data: {
        policy: newPolicy,
        pointsEarned: 75
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/insurance/recommendations:
 *   get:
 *     summary: Get personalized insurance recommendations
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Insurance recommendations retrieved successfully
 */
router.get('/recommendations', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('insuranceProfile wealthProfile');

    if (!user.insuranceProfile) {
      return res.status(404).json({
        success: false,
        message: 'Please complete your insurance profile to get recommendations'
      });
    }

    const recommendations = generateInsuranceRecommendations(
      user.insuranceProfile, 
      user.wealthProfile
    );

    res.status(200).json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/insurance/calculator/life:
 *   post:
 *     summary: Calculate life insurance needs
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - annualIncome
 *               - dependents
 *               - debts
 *               - yearsOfIncome
 *             properties:
 *               annualIncome:
 *                 type: number
 *               dependents:
 *                 type: number
 *               debts:
 *                 type: number
 *               yearsOfIncome:
 *                 type: number
 *               existingCoverage:
 *                 type: number
 *               funeralExpenses:
 *                 type: number
 *               educationExpenses:
 *                 type: number
 *     responses:
 *       200:
 *         description: Life insurance calculation completed
 */
router.post('/calculator/life', protect, [
  body('annualIncome')
    .isFloat({ min: 0 })
    .withMessage('Annual income must be a positive number'),
  body('dependents')
    .isInt({ min: 0 })
    .withMessage('Number of dependents must be 0 or greater'),
  body('debts')
    .isFloat({ min: 0 })
    .withMessage('Debts must be 0 or greater'),
  body('yearsOfIncome')
    .isInt({ min: 1, max: 50 })
    .withMessage('Years of income must be between 1 and 50')
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

    const {
      annualIncome,
      dependents,
      debts,
      yearsOfIncome,
      existingCoverage = 0,
      funeralExpenses = 15000,
      educationExpenses = 0
    } = req.body;

    // Calculate life insurance needs using DIME method
    const calculation = calculateLifeInsuranceNeeds({
      annualIncome,
      dependents,
      debts,
      yearsOfIncome,
      existingCoverage,
      funeralExpenses,
      educationExpenses
    });

    // Award points for using calculator
    await req.user.addPoints(20, 'Used life insurance calculator');

    logger.info(`User ${req.user.username} used life insurance calculator`);

    res.status(200).json({
      success: true,
      data: {
        calculation,
        pointsEarned: 20
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/insurance/claims:
 *   get:
 *     summary: Get insurance claims history
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Claims history retrieved successfully
 */
router.get('/claims', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('insuranceProfile.claims');

    const claims = user.insuranceProfile?.claims || [];
    
    // Group claims by status
    const claimsByStatus = claims.reduce((acc, claim) => {
      if (!acc[claim.status]) {
        acc[claim.status] = [];
      }
      acc[claim.status].push(claim);
      return acc;
    }, {});

    const summary = {
      totalClaims: claims.length,
      approvedClaims: claims.filter(c => c.status === 'approved').length,
      pendingClaims: claims.filter(c => c.status === 'pending').length,
      deniedClaims: claims.filter(c => c.status === 'denied').length,
      totalClaimAmount: claims.reduce((sum, claim) => sum + (claim.amount || 0), 0)
    };

    res.status(200).json({
      success: true,
      data: {
        claims,
        summary,
        claimsByStatus
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/insurance/reminders:
 *   get:
 *     summary: Get insurance reminders
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Insurance reminders retrieved successfully
 */
router.get('/reminders', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('insuranceProfile.policies');

    const policies = user.insuranceProfile?.policies || [];
    const reminders = [];
    const now = new Date();
    const threeMonthsFromNow = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000));

    // Check for policy renewals
    policies.forEach(policy => {
      if (policy.endDate && new Date(policy.endDate) <= threeMonthsFromNow) {
        const daysUntilExpiry = Math.ceil((new Date(policy.endDate) - now) / (1000 * 60 * 60 * 24));
        
        reminders.push({
          type: 'renewal',
          priority: daysUntilExpiry <= 30 ? 'high' : 'medium',
          title: `${policy.type} Insurance Renewal`,
          message: `Your ${policy.type} insurance with ${policy.provider} expires in ${daysUntilExpiry} days`,
          policyId: policy._id,
          dueDate: policy.endDate
        });
      }
    });

    // Check for missing essential coverage
    const essentialTypes = ['health', 'auto', 'life'];
    const existingTypes = policies.map(p => p.type);
    
    essentialTypes.forEach(type => {
      if (!existingTypes.includes(type)) {
        reminders.push({
          type: 'missing_coverage',
          priority: 'medium',
          title: `Consider ${type} Insurance`,
          message: `You don't have ${type} insurance coverage. Consider getting protected.`,
          insuranceType: type
        });
      }
    });

    res.status(200).json({
      success: true,
      data: reminders
    });
  } catch (error) {
    next(error);
  }
});

// Helper functions
function calculateInsuranceCoverageScore(insuranceProfile) {
  if (!insuranceProfile) return 0;
  
  let score = 0;
  const { policies = [], age, annualIncome, dependents } = insuranceProfile;
  
  // Basic coverage types (40 points max)
  const essentialTypes = ['health', 'auto', 'life'];
  const existingTypes = new Set(policies.map(p => p.type));
  
  essentialTypes.forEach(type => {
    if (existingTypes.has(type)) {
      score += type === 'health' ? 20 : 10; // Health insurance weighted more
    }
  });
  
  // Coverage adequacy (30 points max)
  if (annualIncome) {
    const lifeCoverage = policies
      .filter(p => p.type === 'life')
      .reduce((sum, p) => sum + p.coverageAmount, 0);
    
    const adequateLifeCoverage = annualIncome * 10; // 10x annual income rule
    if (lifeCoverage >= adequateLifeCoverage) {
      score += 30;
    } else {
      score += (lifeCoverage / adequateLifeCoverage) * 30;
    }
  }
  
  // Additional coverage (20 points max)
  const additionalTypes = ['disability', 'umbrella', 'home'];
  additionalTypes.forEach(type => {
    if (existingTypes.has(type)) {
      score += 7;
    }
  });
  
  // Regular review (10 points max)
  const recentlyUpdated = policies.some(p => {
    const lastUpdate = new Date(p.addedAt || p.lastUpdated);
    const sixMonthsAgo = new Date(Date.now() - (6 * 30 * 24 * 60 * 60 * 1000));
    return lastUpdate >= sixMonthsAgo;
  });
  
  if (recentlyUpdated) score += 10;
  
  return Math.min(100, Math.round(score));
}

function generateInsuranceRecommendations(insuranceProfile, wealthProfile) {
  const recommendations = [];
  const { policies = [], age, annualIncome, dependents } = insuranceProfile;
  const existingTypes = new Set(policies.map(p => p.type));
  
  // Life insurance recommendations
  if (!existingTypes.has('life') && dependents > 0) {
    recommendations.push({
      type: 'life',
      priority: 'high',
      title: 'Life Insurance Needed',
      description: 'With dependents, life insurance is essential to protect your family.',
      suggestedCoverage: annualIncome * 10,
      reasoning: 'Based on 10x annual income rule'
    });
  }
  
  // Health insurance
  if (!existingTypes.has('health')) {
    recommendations.push({
      type: 'health',
      priority: 'critical',
      title: 'Health Insurance Required',
      description: 'Health insurance is essential for medical expenses protection.',
      reasoning: 'Medical costs can be financially devastating without coverage'
    });
  }
  
  // Disability insurance
  if (!existingTypes.has('disability') && annualIncome > 30000) {
    recommendations.push({
      type: 'disability',
      priority: 'medium',
      title: 'Disability Insurance Recommended',
      description: 'Protect your income if you become unable to work.',
      suggestedCoverage: annualIncome * 0.6,
      reasoning: 'Replace 60% of income if disabled'
    });
  }
  
  // Umbrella insurance for high net worth
  if (wealthProfile?.currentSavings > 500000 && !existingTypes.has('umbrella')) {
    recommendations.push({
      type: 'umbrella',
      priority: 'medium',
      title: 'Umbrella Insurance Suggested',
      description: 'Extra liability protection for your assets.',
      reasoning: 'High net worth individuals need additional liability coverage'
    });
  }
  
  return recommendations;
}

function calculateLifeInsuranceNeeds(params) {
  const {
    annualIncome,
    dependents,
    debts,
    yearsOfIncome,
    existingCoverage,
    funeralExpenses,
    educationExpenses
  } = params;
  
  // DIME Method: Debt + Income + Mortgage + Education
  const incomeReplacement = annualIncome * yearsOfIncome;
  const dependentMultiplier = Math.max(1, dependents * 0.5);
  const totalNeeds = (incomeReplacement * dependentMultiplier) + debts + funeralExpenses + educationExpenses;
  const additionalCoverageNeeded = Math.max(0, totalNeeds - existingCoverage);
  
  // Calculate estimated annual premium (rough estimate)
  const age = 35; // Default age if not provided
  const ratePerThousand = age < 30 ? 1.5 : age < 40 ? 2.0 : age < 50 ? 3.5 : 6.0;
  const estimatedAnnualPremium = (additionalCoverageNeeded / 1000) * ratePerThousand;
  
  return {
    totalNeeds,
    existingCoverage,
    additionalCoverageNeeded,
    breakdown: {
      incomeReplacement: incomeReplacement * dependentMultiplier,
      debts,
      funeralExpenses,
      educationExpenses
    },
    estimatedAnnualPremium: Math.round(estimatedAnnualPremium),
    recommendations: [
      'Consider term life insurance for temporary needs',
      'Review coverage annually or after major life events',
      'Consider permanent life insurance for estate planning'
    ]
  };
}

module.exports = router;