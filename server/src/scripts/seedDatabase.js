/**
 * Seeds a development database with realistic history.
 *
 * The point is not just to have rows: the health sparklines, streaks, budget
 * trends and renewal alerts are all derived, so the seed generates 90 days of
 * plausible day-by-day data rather than a handful of round numbers.
 *
 * Destructive - it clears the collections it seeds. Run with: npm run seed
 */

const connectDB = require('../config/database');
const { disconnectDB } = require('../config/database');
const User = require('../models/User');
const Achievement = require('../models/Achievement');
const Challenge = require('../models/Challenge');
const Team = require('../models/Team');
const Activity = require('../models/Activity');
const Transaction = require('../models/Transaction');
const Policy = require('../models/Policy');
const Goal = require('../models/Goal');
const { pointsFor } = require('../models/metrics');

const DAY_MS = 24 * 60 * 60 * 1000;
const HISTORY_DAYS = 90;

// Deterministic pseudo-random so re-seeding produces the same believable data.
let seedState = 42;
const random = () => {
  seedState = (seedState * 1103515245 + 12345) % 2147483648;
  return seedState / 2147483648;
};
const between = (min, max) => min + random() * (max - min);
const intBetween = (min, max) => Math.round(between(min, max));
const chance = (probability) => random() < probability;

/**
 * A timestamp `n` days ago at roughly `hour`, never in the future.
 *
 * Today's entries would otherwise land at a fixed evening hour even when seeded
 * in the morning, putting them ahead of `now`. That both contradicts the API's
 * no-future-entries rule and pushes them outside any window that ends at now,
 * so challenge progress would measure zero.
 */
const daysAgo = (n, hour = 9) => {
  const d = new Date(Date.now() - n * DAY_MS);
  d.setHours(hour, intBetween(0, 59), 0, 0);
  const cutoff = Date.now() - 60 * 1000;
  return d.getTime() > cutoff ? new Date(cutoff) : d;
};

// title, description, icon, category, type, rarity, points, criteria target/op/value
const ACHIEVEMENTS = [
  ['First Steps', 'Log your first activity', 'footprints', 'milestone', 'milestone', 'common', 50, 'steps', '>=', 1],
  ['Hydration Hero', 'Drink 8 glasses of water in a day', 'droplet', 'health', 'progress', 'common', 75, 'water', '>=', 8],
  ['Early Riser', 'Log a workout before 8am', 'sunrise', 'health', 'special', 'rare', 100, 'workouts', '>=', 1],
  ['Week Warrior', 'Keep a 7 day streak', 'flame', 'streak', 'streak', 'rare', 150, 'streak', '>=', 7],
  ['Budget Keeper', 'Record 30 transactions', 'receipt', 'wealth', 'progress', 'common', 120, 'savings', '>=', 30],
  ['Fully Covered', 'Hold all three essential policies', 'shield', 'insurance', 'completion', 'epic', 200, 'custom', '>=', 3],
  ['Challenge Champion', 'Complete your first challenge', 'trophy', 'challenge', 'completion', 'rare', 200, 'challenges', '>=', 1],
  ['Wellness Guru', 'Reach level 10', 'star', 'level', 'milestone', 'legendary', 500, 'level', '>=', 10]
];

const USERS = [
  {
    username: 'admin',
    email: 'admin@wellnesshub.app',
    password: 'Admin123!',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    activityLevel: 0.9
  },
  {
    username: 'john_doe',
    email: 'john@example.com',
    password: 'Password123!',
    firstName: 'John',
    lastName: 'Doe',
    activityLevel: 0.85
  },
  {
    username: 'jane_smith',
    email: 'jane@example.com',
    password: 'Password123!',
    firstName: 'Jane',
    lastName: 'Smith',
    activityLevel: 0.65
  },
  {
    username: 'sam_rivera',
    email: 'sam@example.com',
    password: 'Password123!',
    firstName: 'Sam',
    lastName: 'Rivera',
    activityLevel: 0.4
  }
];

/** 90 days of health entries, with a believable weekly rhythm and rest days. */
const buildActivities = (userId, activityLevel) => {
  const entries = [];
  let weight = between(68, 82);

  for (let day = HISTORY_DAYS; day >= 0; day -= 1) {
    const date = new Date(Date.now() - day * DAY_MS);
    const isWeekend = [0, 6].includes(date.getDay());

    // Rest days: less likely for committed users, more likely at weekends.
    if (!chance(activityLevel - (isWeekend ? 0.2 : 0))) continue;

    const push = (type, value, hour) => {
      const at = daysAgo(day, hour);
      entries.push({
        user: userId,
        type,
        value: Number(value.toFixed(2)),
        at,
        day: Activity.toDayKey(at),
        pointsEarned: pointsFor(type, value),
        source: 'manual'
      });
    };

    push('steps', between(4000, 15000) * (isWeekend ? 0.8 : 1), 20);
    push('water', intBetween(4, 10), 21);
    push('sleep', between(5.5, 8.8), 7);

    if (chance(0.45)) push('workout', intBetween(20, 75), isWeekend ? 10 : 18);
    if (chance(0.3)) push('meditation', intBetween(5, 25), 8);

    // Weight drifts slowly rather than jumping, and is not recorded daily.
    weight += between(-0.25, 0.2);
    if (chance(0.35)) push('weight', weight, 7);
  }

  return entries;
};

/** Six months of income and expenses, with recurring bills plus variable spend. */
const buildTransactions = (userId, monthlyIncome) => {
  const rows = [];
  const push = (kind, amount, category, description, at) =>
    rows.push({
      user: userId,
      kind,
      amount: Number(amount.toFixed(2)),
      category,
      description,
      at,
      month: Transaction.toMonthKey(at)
    });

  for (let monthOffset = 5; monthOffset >= 0; monthOffset -= 1) {
    const base = new Date();
    base.setMonth(base.getMonth() - monthOffset, 1);
    const inMonth = (dayOfMonth) => {
      const d = new Date(base);
      d.setDate(Math.min(dayOfMonth, 28));
      d.setHours(10, 0, 0, 0);
      return d;
    };

    push('income', monthlyIncome, 'salary', 'Monthly salary', inMonth(1));
    if (chance(0.35)) push('income', between(200, 1200), 'freelance', 'Side project', inMonth(18));

    push('expense', monthlyIncome * between(0.26, 0.32), 'housing', 'Rent', inMonth(2));
    push('expense', between(90, 180), 'utilities', 'Utilities', inMonth(5));
    push('expense', between(35, 70), 'insurance', 'Insurance premiums', inMonth(6));

    const groceryRuns = intBetween(4, 8);
    for (let i = 0; i < groceryRuns; i += 1) {
      push('expense', between(35, 130), 'food', 'Groceries', inMonth(intBetween(1, 28)));
    }

    for (const [category, min, max, probability] of [
      ['transport', 20, 90, 0.9],
      ['entertainment', 15, 120, 0.7],
      ['shopping', 25, 260, 0.6],
      ['health', 20, 150, 0.4],
      ['education', 30, 200, 0.25]
    ]) {
      if (chance(probability)) {
        push('expense', between(min, max), category, null, inMonth(intBetween(1, 28)));
      }
    }
  }

  return rows;
};

const buildPolicies = (userId) => [
  {
    user: userId,
    type: 'health',
    provider: 'BlueShield',
    policyNumber: 'HS-4471-22',
    coverageAmount: 500000,
    premium: 240,
    premiumFrequency: 'monthly',
    startDate: daysAgo(500),
    // Deliberately near-term so the renewal alerts have something to show.
    renewalDate: new Date(Date.now() + 24 * DAY_MS),
    deductible: 1500
  },
  {
    user: userId,
    type: 'auto',
    provider: 'Northwind Mutual',
    policyNumber: 'AU-9930-11',
    coverageAmount: 60000,
    premium: 420,
    premiumFrequency: 'quarterly',
    startDate: daysAgo(300),
    renewalDate: new Date(Date.now() + 112 * DAY_MS),
    deductible: 750
  },
  {
    user: userId,
    type: 'travel',
    provider: 'Voyager Cover',
    coverageAmount: 25000,
    premium: 95,
    premiumFrequency: 'annual',
    startDate: daysAgo(120),
    renewalDate: new Date(Date.now() + 245 * DAY_MS)
  }
];

const seed = async () => {
  console.log('Seeding WellnessHub...');
  await connectDB();

  console.log('  clearing collections');
  await Promise.all([
    User.deleteMany({}),
    Achievement.deleteMany({}),
    Challenge.deleteMany({}),
    Team.deleteMany({}),
    Activity.deleteMany({}),
    Transaction.deleteMany({}),
    Policy.deleteMany({}),
    Goal.deleteMany({})
  ]);

  const achievements = await Achievement.insertMany(
    ACHIEVEMENTS.map(
      ([title, description, icon, category, type, rarity, points, target, operator, value]) => ({
        title,
        description,
        icon,
        category,
        type,
        rarity,
        points,
        experiencePoints: points,
        isActive: true,
        isPublic: true,
        criteria: { target, operator, value }
      })
    )
  );
  console.log(`  ${achievements.length} achievements`);

  const users = [];
  for (const { activityLevel, ...spec } of USERS) {
    const user = await User.create({
      ...spec,
      healthMetrics: {
        dailyStepGoal: 10000,
        dailyWaterGoal: 8,
        weeklyWorkoutMinuteGoal: 150,
        dailySleepGoal: 8,
        dailyMeditationGoal: 10,
        targetWeight: 72
      },
      financialMetrics: {
        monthlyIncome: intBetween(4200, 7600),
        monthlySavingsGoal: 900,
        emergencyFundGoal: 15000,
        currentSavings: intBetween(3000, 18000),
        creditScore: intBetween(660, 810),
        riskTolerance: 'moderate'
      }
    });
    users.push({ user, activityLevel });
  }
  console.log(`  ${users.length} users`);

  let totalActivities = 0;
  let totalTransactions = 0;

  for (const { user, activityLevel } of users) {
    const activities = buildActivities(user._id, activityLevel);
    await Activity.insertMany(activities);
    totalActivities += activities.length;

    const transactions = buildTransactions(user._id, user.financialMetrics.monthlyIncome);
    await Transaction.insertMany(transactions);
    totalTransactions += transactions.length;

    await Policy.insertMany(buildPolicies(user._id));

    await Goal.create({
      user: user._id,
      domain: 'wealth',
      title: 'Emergency fund',
      targetValue: 15000,
      unit: 'USD',
      dueDate: new Date(Date.now() + 240 * DAY_MS),
      contributions: [
        { amount: 4000, at: daysAgo(80), note: 'Opening balance' },
        { amount: 1200, at: daysAgo(50) },
        { amount: 1500, at: daysAgo(20) }
      ]
    });

    // Points and streaks are derived from the activities just inserted, so the
    // user document agrees with the log rather than being invented separately.
    const earned = activities.reduce((sum, a) => sum + a.pointsEarned, 0);
    const { computeStreaks } = require('../services/streaks');
    const streaks = computeStreaks([...new Set(activities.map((a) => a.day))]);

    user.totalPoints = earned;
    user.availablePoints = earned;
    user.experience = earned;
    user.currentStreak = streaks.current;
    user.longestStreak = streaks.longest;
    user.achievements = achievements.slice(0, intBetween(1, 4)).map((a) => ({
      achievementId: a._id,
      unlockedAt: daysAgo(intBetween(5, 60))
    }));
    await user.save();
  }

  console.log(`  ${totalActivities} activities, ${totalTransactions} transactions`);

  const owner = users[0].user;
  const challenges = await Challenge.insertMany([
    {
      title: '10,000 Steps Daily',
      description: 'Walk 10,000 steps every day for a week',
      category: 'health',
      type: 'individual',
      difficulty: 'medium',
      points: 500,
      experiencePoints: 500,
      duration: 7,
      target: { type: 'count', value: 10000, unit: 'steps' },
      startDate: daysAgo(2),
      endDate: new Date(Date.now() + 5 * DAY_MS),
      createdBy: owner._id,
      status: 'active',
      isActive: true,
      isPublic: true
    },
    {
      title: 'Hydration Challenge',
      description: 'Drink 8 glasses of water daily for 30 days',
      category: 'health',
      type: 'community',
      difficulty: 'easy',
      points: 300,
      experiencePoints: 300,
      duration: 30,
      target: { type: 'count', value: 8, unit: 'glasses' },
      startDate: daysAgo(10),
      endDate: new Date(Date.now() + 20 * DAY_MS),
      createdBy: owner._id,
      status: 'active',
      isActive: true,
      isPublic: true
    },
    {
      title: 'Save $1000',
      description: 'Put aside $1000 towards your emergency fund',
      category: 'wealth',
      type: 'individual',
      difficulty: 'hard',
      points: 1000,
      experiencePoints: 1000,
      duration: 90,
      target: { type: 'amount', value: 1000, unit: 'USD' },
      startDate: daysAgo(20),
      endDate: new Date(Date.now() + 70 * DAY_MS),
      createdBy: owner._id,
      status: 'active',
      isActive: true,
      isPublic: true
    }
  ]);
  console.log(`  ${challenges.length} challenges`);

  const team = await Team.create({
    name: 'Wellness Warriors',
    description: 'Complete wellness across all categories',
    category: 'mixed',
    type: 'public',
    creator: owner._id,
    leaders: [{ userId: owner._id, role: 'captain' }],
    members: users.map(({ user }) => ({ userId: user._id, status: 'active' }))
  });

  await User.updateMany(
    { _id: { $in: users.map(({ user }) => user._id) } },
    { $set: { teams: [{ teamId: team._id, role: 'member' }] } }
  );
  console.log('  1 team');

  console.log('\nDone. Sign in with:');
  console.log('  admin@wellnesshub.app / Admin123!   (admin)');
  console.log('  john@example.com      / Password123!');
  console.log('  jane@example.com      / Password123!');
  console.log('  sam@example.com       / Password123!');
};

seed()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDB();
  });
