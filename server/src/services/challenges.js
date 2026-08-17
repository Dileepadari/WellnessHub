const mongoose = require('mongoose');
const Activity = require('../models/Activity');
const Transaction = require('../models/Transaction');
const Goal = require('../models/Goal');
const { METRIC_TYPES } = require('../models/metrics');

/**
 * Challenge progress is measured, not self-reported.
 *
 * A challenge declares a `target` ({ type, value, unit }) and a date window. This
 * resolves the unit to a source of truth - the Activity log for health units, the
 * Transaction/Goal collections for money - and measures what the user actually
 * did inside the window. Nothing is stored until `syncParticipant` writes the
 * measured figure back, so progress cannot drift from the underlying records.
 */

/** Maps a challenge target unit onto the metric that measures it. */
const UNIT_TO_METRIC = {
  steps: 'steps',
  step: 'steps',
  glasses: 'water',
  glass: 'water',
  water: 'water',
  minutes: 'workout',
  minute: 'workout',
  workouts: 'workout',
  hours: 'sleep',
  sleep: 'sleep',
  kg: 'weight',
  meditation: 'meditation'
};

const resolveMetric = (challenge) => {
  const unit = (challenge.target?.unit || '').toLowerCase();
  if (UNIT_TO_METRIC[unit]) return UNIT_TO_METRIC[unit];
  // Fall back to the unit itself when it is already a metric name.
  return METRIC_TYPES.includes(unit) ? unit : null;
};

/**
 * The window progress is measured over.
 *
 * It starts at the later of the challenge's start date and the *day* the user
 * joined - not the join instant. Joining at 6pm should still count the steps
 * already logged that morning, but never days before the user signed up.
 */
const windowFor = (challenge, participant) => {
  const joinedDay = participant?.joinedAt ? new Date(participant.joinedAt) : null;
  if (joinedDay) joinedDay.setHours(0, 0, 0, 0);

  const start = joinedDay
    ? new Date(Math.max(joinedDay.getTime(), new Date(challenge.startDate).getTime()))
    : new Date(challenge.startDate);
  const end = new Date(Math.min(Date.now(), new Date(challenge.endDate).getTime()));
  return { start, end };
};

/**
 * How much of the target the user has achieved.
 *
 * `frequency` targets count qualifying days rather than summing a value - "walk
 * 10,000 steps every day for a week" is seven daily wins, not 70,000 steps.
 */
const measure = async (user, challenge, participant) => {
  const { start, end } = windowFor(challenge, participant);
  const targetType = challenge.target?.type;
  const targetValue = challenge.target?.value ?? 0;
  const userId = new mongoose.Types.ObjectId(user._id);

  if (challenge.category === 'wealth' || targetType === 'amount') {
    // Money challenges measure saved amount: goal contributions in the window,
    // falling back to net income minus expenses.
    const goals = await Goal.find({ user: user._id, domain: 'wealth' }).lean();
    const contributed = goals
      .flatMap((goal) => goal.contributions || [])
      .filter((c) => new Date(c.at) >= start && new Date(c.at) <= end)
      .reduce((sum, c) => sum + (c.amount || 0), 0);

    if (contributed > 0) return contributed;

    const rows = await Transaction.aggregate([
      { $match: { user: userId, at: { $gte: start, $lte: end } } },
      { $group: { _id: '$kind', total: { $sum: '$amount' } } }
    ]);
    const income = rows.find((r) => r._id === 'income')?.total ?? 0;
    const expenses = rows.find((r) => r._id === 'expense')?.total ?? 0;
    return Math.max(0, income - expenses);
  }

  const metric = resolveMetric(challenge);
  if (!metric) return 0;

  if (targetType === 'frequency') {
    // Count days where the daily total met the target value.
    const days = await Activity.aggregate([
      { $match: { user: userId, type: metric, at: { $gte: start, $lte: end } } },
      { $group: { _id: '$day', total: { $sum: '$value' } } },
      { $match: { total: { $gte: targetValue } } },
      { $count: 'days' }
    ]);
    return days[0]?.days ?? 0;
  }

  const rows = await Activity.aggregate([
    { $match: { user: userId, type: metric, at: { $gte: start, $lte: end } } },
    { $group: { _id: null, total: { $sum: '$value' } } }
  ]);
  return Math.round(rows[0]?.total ?? 0);
};

/**
 * The figure a frequency challenge is judged against is its duration in days,
 * not its target value - the target value is the per-day bar.
 */
const goalFor = (challenge) =>
  challenge.target?.type === 'frequency'
    ? challenge.duration || challenge.target?.value || 1
    : challenge.target?.value || 1;

/** Measured progress for one challenge, without writing anything. */
const progressFor = async (user, challenge, participant) => {
  const current = await measure(user, challenge, participant);
  const goal = goalFor(challenge);
  const percent = Math.max(0, Math.min(100, Math.round((current / goal) * 100)));

  return {
    current,
    goal,
    percent,
    unit: challenge.target?.unit || '',
    metric: resolveMetric(challenge),
    completed: percent >= 100
  };
};

/**
 * Recomputes and persists a participant's progress, awarding the challenge's
 * points the first time it completes.
 *
 * Returns `{ progress, justCompleted }` so callers can react to a completion
 * without re-reading the document.
 */
const syncParticipant = async (user, challenge, { award = true } = {}) => {
  const participant = challenge.participants.find(
    (p) => p.userId.toString() === user._id.toString()
  );
  if (!participant) return null;

  const progress = await progressFor(user, challenge, participant);
  const wasCompleted = participant.completed;

  participant.progress = progress.percent;
  if (progress.completed && !wasCompleted) {
    participant.completed = true;
    participant.completedAt = new Date();
  }
  await challenge.save();

  // Mirror onto the user's own list so /auth/me reflects it without a join.
  const entry = (user.activeChallenges || []).find(
    (c) => c.challengeId?.toString() === challenge._id.toString()
  );
  if (entry) {
    entry.progress = progress.percent;
    if (progress.completed && !entry.completed) {
      entry.completed = true;
      entry.completedAt = new Date();
    }
  }

  const justCompleted = progress.completed && !wasCompleted;
  if (justCompleted && award) {
    await user.addPoints(challenge.points || 0, `Completed ${challenge.title}`);
  } else if (entry) {
    await user.save();
  }

  return { progress, justCompleted };
};

module.exports = { progressFor, syncParticipant, resolveMetric, goalFor };
