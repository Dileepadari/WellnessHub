const mongoose = require('mongoose');
const Achievement = require('../models/Achievement');
const Activity = require('../models/Activity');
const Transaction = require('../models/Transaction');
const Policy = require('../models/Policy');
const { streaksForUser } = require('./streaks');
const logger = require('../utils/logger');

/**
 * Evaluates the achievement catalogue against what the user has actually done
 * and unlocks anything newly earned.
 *
 * Called after a write that could move the needle (logging an activity,
 * completing a challenge). It is deliberately idempotent: an achievement already
 * in `user.achievements` is skipped, so re-running never double-awards.
 */

const OPERATORS = {
  '>=': (actual, expected) => actual >= expected,
  '>': (actual, expected) => actual > expected,
  '=': (actual, expected) => actual === expected,
  '<': (actual, expected) => actual < expected,
  '<=': (actual, expected) => actual <= expected,
  in: (actual, expected) => Array.isArray(expected) && expected.includes(actual),
  between: (actual, expected) =>
    Array.isArray(expected) && expected.length === 2 && actual >= expected[0] && actual <= expected[1]
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Start of the window a criterion is measured over. */
const windowStart = (timeframe) => {
  const now = Date.now();
  switch (timeframe) {
    case 'daily':
      return new Date(new Date().setHours(0, 0, 0, 0));
    case 'weekly':
      return new Date(now - 7 * DAY_MS);
    case 'monthly':
      return new Date(now - 30 * DAY_MS);
    case 'yearly':
      return new Date(now - 365 * DAY_MS);
    default:
      return new Date(0);
  }
};

/**
 * Builds every figure the catalogue can be evaluated against, in one pass, so
 * checking eight achievements does not mean eight round trips per metric.
 */
const buildFacts = async (user) => {
  const userId = new mongoose.Types.ObjectId(user._id);
  const streaks = await streaksForUser(user._id);

  // Totals per metric for each timeframe the catalogue actually uses.
  const timeframes = ['daily', 'weekly', 'monthly', 'total'];
  const byTimeframe = {};

  for (const timeframe of timeframes) {
    const rows = await Activity.aggregate([
      { $match: { user: userId, at: { $gte: windowStart(timeframe) } } },
      { $group: { _id: '$type', total: { $sum: '$value' }, entries: { $sum: 1 } } }
    ]);
    byTimeframe[timeframe] = rows.reduce((acc, row) => {
      acc[row._id] = { total: row.total, entries: row.entries };
      return acc;
    }, {});
  }

  // The daily peak matters for "drink 8 glasses in a day" style criteria.
  const dailyPeaks = await Activity.aggregate([
    { $match: { user: userId } },
    { $group: { _id: { type: '$type', day: '$day' }, total: { $sum: '$value' } } },
    { $group: { _id: '$_id.type', peak: { $max: '$total' } } }
  ]);
  const peaks = dailyPeaks.reduce((acc, row) => {
    acc[row._id] = row.peak;
    return acc;
  }, {});

  const [transactionCount, policyTypes] = await Promise.all([
    Transaction.countDocuments({ user: user._id }),
    Policy.distinct('type', { user: user._id, status: 'active' })
  ]);

  const completedChallenges = (user.activeChallenges || []).filter((c) => c.completed).length;

  return { byTimeframe, peaks, transactionCount, policyTypes, completedChallenges, streaks, user };
};

/** Resolves one criterion target to a number using the prepared facts. */
const valueFor = (target, timeframe, facts) => {
  const scope = facts.byTimeframe[timeframe] || facts.byTimeframe.total;
  const totalOf = (metric) => scope[metric]?.total ?? 0;

  switch (target) {
    // Day-scoped metrics compare against the best single day, which is what
    // "8 glasses in a day" means regardless of the declared timeframe.
    case 'steps':
      return timeframe === 'total' ? facts.peaks.steps ?? 0 : totalOf('steps');
    case 'water':
      return timeframe === 'total' ? facts.peaks.water ?? 0 : totalOf('water');
    case 'workouts':
      return scope.workout?.entries ?? 0;
    case 'savings':
      return facts.transactionCount;
    case 'challenges':
      return facts.completedChallenges;
    case 'streak':
      return facts.streaks.longest;
    case 'level':
      return facts.user.level ?? 1;
    case 'friends':
      return (facts.user.friends || []).length;
    case 'posts':
      return (facts.user.activities || []).length;
    case 'custom':
      // The only custom criterion in the catalogue counts essential cover held.
      return facts.policyTypes.filter((t) => ['health', 'life', 'auto'].includes(t)).length;
    default:
      return 0;
  }
};

const meetsCriteria = (achievement, facts) => {
  const { target, operator, value, timeframe = 'total' } = achievement.criteria || {};
  const compare = OPERATORS[operator];
  if (!compare || !target) return false;
  return compare(valueFor(target, timeframe, facts), value);
};

/** Prerequisites must already be unlocked before an achievement can be. */
const prerequisitesMet = (achievement, unlockedIds) =>
  (achievement.prerequisites || []).every(
    (prereq) => !prereq.required || unlockedIds.has(prereq.achievementId?.toString())
  );

/**
 * Unlocks every newly earned achievement and awards its points.
 * Returns the achievements unlocked by this call.
 */
const evaluate = async (user) => {
  const now = new Date();

  const available = await Achievement.find({
    isActive: true,
    // Both window bounds must hold; two sibling $or keys would collapse to the last.
    $and: [
      { $or: [{ availableFrom: { $exists: false } }, { availableFrom: { $lte: now } }] },
      { $or: [{ availableTo: { $exists: false } }, { availableTo: { $gte: now } }] }
    ]
  });

  const unlockedIds = new Set(
    (user.achievements || []).map((entry) => entry.achievementId?.toString()).filter(Boolean)
  );

  const candidates = available.filter((a) => !unlockedIds.has(a._id.toString()));
  if (candidates.length === 0) return [];

  const facts = await buildFacts(user);
  const unlocked = [];

  for (const achievement of candidates) {
    if (!prerequisitesMet(achievement, unlockedIds)) continue;
    if (!meetsCriteria(achievement, facts)) continue;

    user.achievements.push({ achievementId: achievement._id, unlockedAt: new Date() });
    unlockedIds.add(achievement._id.toString());
    unlocked.push(achievement);

    achievement.stats.totalUnlocked = (achievement.stats.totalUnlocked || 0) + 1;
    if (!achievement.stats.firstUnlockedAt) achievement.stats.firstUnlockedAt = new Date();
    achievement.stats.lastUnlockedAt = new Date();
    await achievement.save();
  }

  if (unlocked.length > 0) {
    const points = unlocked.reduce((sum, a) => sum + (a.points || 0), 0);
    // addPoints saves the user, which persists the pushed achievements too.
    await user.addPoints(points, `Unlocked ${unlocked.length} achievement(s)`);
    logger.debug(`${user.username} unlocked: ${unlocked.map((a) => a.title).join(', ')}`);
  }

  return unlocked;
};

module.exports = { evaluate, meetsCriteria, buildFacts };
