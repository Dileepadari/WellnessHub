/**
 * Single source of truth for the health metrics the app tracks.
 *
 * Routes, aggregation and points all read from here, so adding a metric means
 * editing this table and nothing else. The client fetches the same definitions
 * from GET /api/health/metrics so its table columns stay in step.
 */

const METRICS = {
  steps: {
    label: 'Steps',
    unit: 'steps',
    // How multiple entries on the same day combine into one figure.
    aggregate: 'sum',
    // Whether the goal is measured per day or per week.
    goalPeriod: 'day',
    goalField: 'dailyStepGoal',
    higherIsBetter: true,
    precision: 0,
    pointsPer: (value) => Math.floor(value / 1000) * 5
  },
  water: {
    label: 'Water',
    unit: 'glasses',
    aggregate: 'sum',
    goalPeriod: 'day',
    goalField: 'dailyWaterGoal',
    higherIsBetter: true,
    precision: 0,
    pointsPer: (value) => Math.floor(value) * 2
  },
  workout: {
    label: 'Workout',
    unit: 'minutes',
    aggregate: 'sum',
    goalPeriod: 'week',
    goalField: 'weeklyWorkoutMinuteGoal',
    higherIsBetter: true,
    precision: 0,
    pointsPer: (value) => Math.floor(value / 10) * 10
  },
  sleep: {
    label: 'Sleep',
    unit: 'hours',
    // Two sleep entries in a day is a nap plus a night; the day's figure is the total.
    aggregate: 'sum',
    goalPeriod: 'day',
    goalField: 'dailySleepGoal',
    higherIsBetter: true,
    precision: 1,
    pointsPer: (value) => (value >= 7 ? 20 : 5)
  },
  weight: {
    label: 'Weight',
    unit: 'kg',
    // A weight is a reading, not a quantity - the latest one wins for the day.
    aggregate: 'last',
    goalPeriod: 'day',
    goalField: 'targetWeight',
    higherIsBetter: false,
    precision: 1,
    pointsPer: () => 5
  },
  meditation: {
    label: 'Meditation',
    unit: 'minutes',
    aggregate: 'sum',
    goalPeriod: 'day',
    goalField: 'dailyMeditationGoal',
    higherIsBetter: true,
    precision: 0,
    pointsPer: (value) => Math.floor(value)
  }
};

const METRIC_TYPES = Object.keys(METRICS);

/** Points awarded for logging `value` of `type`, capped so one entry cannot farm points. */
const pointsFor = (type, value) => {
  const metric = METRICS[type];
  if (!metric) return 0;
  return Math.max(0, Math.min(200, Math.round(metric.pointsPer(value))));
};

/** The client needs the definitions but not the point functions. */
const publicMetrics = () =>
  Object.fromEntries(
    Object.entries(METRICS).map(([type, m]) => [
      type,
      {
        label: m.label,
        unit: m.unit,
        aggregate: m.aggregate,
        goalPeriod: m.goalPeriod,
        higherIsBetter: m.higherIsBetter,
        precision: m.precision
      }
    ])
  );

module.exports = { METRICS, METRIC_TYPES, pointsFor, publicMetrics };
