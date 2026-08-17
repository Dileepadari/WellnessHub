const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Policy = require('../models/Policy');
const { protect, rateLimitByUser } = require('../middleware/auth');

const router = express.Router();

const rejectInvalid = (req, res) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  return true;
};

/**
 * @swagger
 * /api/insurance/types:
 *   get:
 *     summary: Valid policy types
 *     tags: [Insurance]
 */
router.get('/types', (req, res) => {
  res.status(200).json({
    success: true,
    data: { types: Policy.POLICY_TYPES, essential: Policy.ESSENTIAL_TYPES }
  });
});

/**
 * @swagger
 * /api/insurance/policies:
 *   get:
 *     summary: All policies with coverage and premium totals
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 *   post:
 *     summary: Add a policy
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/policies',
  protect,
  [query('status').optional().isIn(['active', 'lapsed', 'cancelled'])],
  async (req, res, next) => {
    if (rejectInvalid(req, res)) return;
    try {
      const filter = { user: req.user._id };
      if (req.query.status) filter.status = req.query.status;

      const policies = await Policy.find(filter).sort({ renewalDate: 1 });
      const active = policies.filter((p) => p.status === 'active');

      res.status(200).json({
        success: true,
        data: {
          policies,
          summary: {
            total: policies.length,
            active: active.length,
            totalCoverage: active.reduce((sum, p) => sum + (p.coverageAmount || 0), 0),
            totalAnnualPremium: active.reduce((sum, p) => sum + p.annualPremium, 0),
            byType: countBy(active, 'type')
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

function countBy(items, key) {
  return items.reduce((acc, item) => {
    acc[item[key]] = (acc[item[key]] || 0) + 1;
    return acc;
  }, {});
}

router.post(
  '/policies',
  protect,
  rateLimitByUser(30, 24 * 60 * 60 * 1000),
  [
    body('type').isIn(Policy.POLICY_TYPES).withMessage('Invalid policy type'),
    body('provider').trim().isLength({ min: 1, max: 80 }).withMessage('Provider is required'),
    body('coverageAmount').isFloat({ min: 0 }).withMessage('Coverage is required').toFloat(),
    body('premium').isFloat({ min: 0 }).withMessage('Premium is required').toFloat(),
    body('premiumFrequency').optional().isIn(['monthly', 'quarterly', 'semi-annual', 'annual']),
    body('renewalDate').isISO8601().withMessage('A renewal date is required').toDate(),
    body('startDate').optional().isISO8601().toDate(),
    body('policyNumber').optional().trim().isLength({ max: 60 }),
    body('deductible').optional().isFloat({ min: 0 }).toFloat(),
    body('notes').optional().trim().isLength({ max: 280 })
  ],
  async (req, res, next) => {
    if (rejectInvalid(req, res)) return;
    try {
      const policy = await Policy.create({ ...req.body, user: req.user._id });
      res.status(201).json({ success: true, message: 'Policy added', data: { policy } });
    } catch (error) {
      if (error.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: error.message });
      }
      next(error);
    }
  }
);

router.put('/policies/:id', protect, async (req, res, next) => {
  try {
    // `user` is stripped so a request body cannot reassign the policy's owner.
    const updates = { ...req.body };
    delete updates.user;

    const policy = await Policy.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      updates,
      { new: true, runValidators: true }
    );

    if (!policy) {
      return res.status(404).json({ success: false, message: 'Policy not found' });
    }

    res.status(200).json({ success: true, message: 'Policy updated', data: { policy } });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid policy id' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
});

router.delete('/policies/:id', protect, async (req, res, next) => {
  try {
    const policy = await Policy.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!policy) {
      return res.status(404).json({ success: false, message: 'Policy not found' });
    }
    res.status(200).json({ success: true, message: 'Policy deleted', data: { policy } });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid policy id' });
    }
    next(error);
  }
});

/**
 * @swagger
 * /api/insurance/alerts:
 *   get:
 *     summary: Renewals due soon and essential coverage gaps
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/alerts',
  protect,
  [query('withinDays').optional().isInt({ min: 1, max: 365 }).toInt()],
  async (req, res, next) => {
    if (rejectInvalid(req, res)) return;
    try {
      const withinDays = req.query.withinDays || 90;
      const policies = await Policy.find({ user: req.user._id, status: 'active' });

      const alerts = [];

      for (const policy of policies) {
        const days = policy.daysUntilRenewal;
        if (days === null || days > withinDays) continue;

        alerts.push({
          kind: days < 0 ? 'overdue' : 'renewal',
          severity: days < 0 ? 'high' : days <= 30 ? 'high' : 'medium',
          title: `${policy.type} renewal - ${policy.provider}`,
          detail:
            days < 0
              ? `Lapsed ${Math.abs(days)} days ago`
              : `Renews in ${days} day${days === 1 ? '' : 's'}`,
          policyId: policy._id,
          dueDate: policy.renewalDate,
          daysUntil: days
        });
      }

      // Essential cover the user holds no active policy for.
      const held = new Set(policies.map((p) => p.type));
      for (const type of Policy.ESSENTIAL_TYPES) {
        if (held.has(type)) continue;
        alerts.push({
          kind: 'gap',
          severity: 'medium',
          title: `No ${type} cover`,
          detail: `You have no active ${type} policy on file`,
          insuranceType: type
        });
      }

      // Most urgent first: overdue, then soonest renewal, then gaps.
      const rank = { overdue: 0, renewal: 1, gap: 2 };
      alerts.sort(
        (a, b) => rank[a.kind] - rank[b.kind] || (a.daysUntil ?? 999) - (b.daysUntil ?? 999)
      );

      res.status(200).json({ success: true, data: { alerts, withinDays } });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/insurance/coverage:
 *   get:
 *     summary: Coverage score and where it is weak
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 */
router.get('/coverage', protect, async (req, res, next) => {
  try {
    const policies = await Policy.find({ user: req.user._id, status: 'active' });
    const held = new Set(policies.map((p) => p.type));

    // 60 points for holding each essential cover, 40 for breadth beyond that.
    const essentialsHeld = Policy.ESSENTIAL_TYPES.filter((t) => held.has(t));
    const essentialScore = (essentialsHeld.length / Policy.ESSENTIAL_TYPES.length) * 60;
    const breadthScore = Math.min(held.size / Policy.POLICY_TYPES.length, 1) * 40;

    const annualPremium = policies.reduce((sum, p) => sum + p.annualPremium, 0);
    const monthlyIncome = req.user.financialMetrics?.monthlyIncome;
    const premiumToIncome =
      monthlyIncome > 0 ? Math.round((annualPremium / (monthlyIncome * 12)) * 100) : null;

    res.status(200).json({
      success: true,
      data: {
        score: Math.round(essentialScore + breadthScore),
        essentialsHeld,
        essentialsMissing: Policy.ESSENTIAL_TYPES.filter((t) => !held.has(t)),
        typesHeld: [...held],
        annualPremium,
        premiumToIncomePercent: premiumToIncome
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
