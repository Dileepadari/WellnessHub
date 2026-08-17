const mongoose = require('mongoose');
const Activity = require('../models/Activity');
const { METRICS, METRIC_TYPES } = require('../models/metrics');
const { streaksForUser } = require('./streaks');

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Monday-based start of the current week. */
const startOfWeek = (date = new Date()) => {
  const d = startOfDay(date);
  const weekday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - weekday);
  return d;
};

const goalFor = (user, type) => {
  const metric = METRICS[type];
  if (!metric) return null;
  const goal = user?.healthMetrics?.[metric.goalField];
  return typeof goal === 'number' && goal > 0 ? goal : null;
};

/**
 * The figure a metric is judged against right now: today's total for daily
 * metrics, this week's for weekly ones.
 */
const currentWindow = (type) =>
  METRICS[type].goalPeriod === 'week' ? startOfWeek() : startOfDay();

/**
 * One row per metric: the current figure, its goal, and a daily series for the
 * sparkline. This is the payload the health table renders.
 */
const summary = async (user, days = 7) => {
  const from = new Date(Date.now() - (days - 1) * DAY_MS);
  const fromDay = startOfDay(from);

  const rows = await Promise.all(
    METRIC_TYPES.map(async (type) => {
      const metric = METRICS[type];
      const series = await Activity.dailySeries(user._id, type, fromDay);

      const windowStart = currentWindow(type);
      const inWindow = series.filter((point) => new Date(point.day) >= startOfDay(windowStart));

      let currentValue = 0;
      if (metric.aggregate === 'last') {
        // A reading carries forward: the latest weight is still the current
        // weight on a day it was not re-measured. Falling back to 0 would read
        // as "you weigh nothing today".
        const latest = series.at(-1);
        currentValue = latest ? latest.value : 0;
      } else if (inWindow.length) {
        const total = inWindow.reduce((sum, p) => sum + p.value, 0);
        currentValue = metric.aggregate === 'avg' ? total / inWindow.length : total;
      }

      const goal = goalFor(user, type);
      const rounded = Number(currentValue.toFixed(metric.precision));

      return {
        type,
        label: metric.label,
        unit: metric.unit,
        aggregate: metric.aggregate,
        goalPeriod: metric.goalPeriod,
        higherIsBetter: metric.higherIsBetter,
        precision: metric.precision,
        value: rounded,
        goal,
        // A percentage bar is meaningless for weight, where the target is a
        // level to reach rather than a quantity to accumulate.
        progress: goal && metric.higherIsBetter ? Math.round((rounded / goal) * 100) : null,
        entries: inWindow.reduce((sum, p) => sum + p.entries, 0),
        // Dense, one slot per day, so the sparkline has a fixed x-axis.
        series: fillSeries(series, days, metric.precision, metric.aggregate === 'last')
      };
    })
  );

  const streaks = await streaksForUser(user._id);
  const totalEntries = await Activity.countDocuments({ user: user._id, at: { $gte: fromDay } });

  return { days, rows, streaks, totalEntries };
};

/**
 * Pads a sparse aggregation result to one entry per day, oldest first.
 *
 * `carryForward` is for reading-style metrics like weight: a day with no
 * measurement keeps the previous value instead of dropping to zero, which would
 * draw a sawtooth in the sparkline that never happened.
 */
function fillSeries(series, days, precision, carryForward = false) {
  const byDay = new Map(series.map((point) => [point.day, point.value]));
  const out = [];
  let previous = 0;

  for (let i = days - 1; i >= 0; i -= 1) {
    const day = Activity.toDayKey(new Date(Date.now() - i * DAY_MS));
    const measured = byDay.get(day);
    const value = measured ?? (carryForward ? previous : 0);
    if (measured !== undefined) previous = measured;
    out.push({ day, value: Number(value.toFixed(precision)) });
  }
  return out;
}

/** Recent raw entries, for the log table. */
const recentEntries = (userId, limit = 25) =>
  Activity.find({ user: userId }).sort({ at: -1 }).limit(limit).lean();

/** Totals per metric across a window, used by the analytics module. */
const totalsByType = (userId, fromDate) =>
  Activity.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId), at: { $gte: fromDate } } },
    { $group: { _id: '$type', total: { $sum: '$value' }, entries: { $sum: 1 } } },
    { $project: { _id: 0, type: '$_id', total: 1, entries: 1 } }
  ]);

module.exports = { summary, recentEntries, totalsByType, startOfDay, startOfWeek };
