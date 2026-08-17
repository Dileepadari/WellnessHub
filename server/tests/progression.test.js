const request = require('supertest');
const { app, registerUser } = require('./helpers');
const User = require('../src/models/User');
const Challenge = require('../src/models/Challenge');
const Achievement = require('../src/models/Achievement');
const { progressFor } = require('../src/services/challenges');

const DAY_MS = 24 * 60 * 60 * 1000;

const makeChallenge = (overrides = {}) =>
  Challenge.create({
    title: 'Step it up',
    description: 'Walk a lot this week',
    category: 'health',
    type: 'individual',
    difficulty: 'medium',
    points: 500,
    experiencePoints: 500,
    duration: 7,
    target: { type: 'count', value: 10000, unit: 'steps' },
    startDate: new Date(Date.now() - DAY_MS),
    endDate: new Date(Date.now() + 6 * DAY_MS),
    status: 'active',
    isActive: true,
    isPublic: true,
    ...overrides
  });

describe('challenge progress', () => {
  let token;
  let userId;

  beforeEach(async () => {
    const registered = await registerUser();
    token = registered.token;
    userId = registered.user._id;
  });

  const auth = (req) => req.set('Authorization', `Bearer ${token}`);
  const log = (payload) => auth(request(app).post('/api/health/activities')).send(payload);

  it('lists joined challenges with measured progress', async () => {
    const challenge = await makeChallenge({ createdBy: userId });
    await auth(request(app).post(`/api/challenges/${challenge._id}/join`)).expect(200);

    await log({ type: 'steps', value: 4000 });

    const res = await auth(request(app).get('/api/challenges/mine'));

    expect(res.status).toBe(200);
    expect(res.body.data.challenges).toHaveLength(1);
    expect(res.body.data.challenges[0].progress).toMatchObject({
      current: 4000,
      goal: 10000,
      percent: 40,
      completed: false
    });
  });

  // The whole point of measuring rather than self-reporting.
  it('advances progress as activities are logged', async () => {
    const challenge = await makeChallenge({ createdBy: userId });
    await auth(request(app).post(`/api/challenges/${challenge._id}/join`));

    await log({ type: 'steps', value: 3000 });
    await log({ type: 'steps', value: 2000 });

    const res = await auth(request(app).get('/api/challenges/mine'));
    expect(res.body.data.challenges[0].progress.current).toBe(5000);
  });

  it('completes the challenge and awards its points once the target is met', async () => {
    const challenge = await makeChallenge({ createdBy: userId, points: 500 });
    await auth(request(app).post(`/api/challenges/${challenge._id}/join`));

    const before = await User.findById(userId);
    const res = await log({ type: 'steps', value: 10000 });

    expect(res.body.data.challengesCompleted).toHaveLength(1);
    expect(res.body.data.challengesCompleted[0].title).toBe('Step it up');

    const after = await User.findById(userId);
    // Activity points plus the challenge award.
    expect(after.totalPoints).toBeGreaterThan(before.totalPoints + 500);
  });

  it('does not award the same challenge twice', async () => {
    const challenge = await makeChallenge({ createdBy: userId });
    await auth(request(app).post(`/api/challenges/${challenge._id}/join`));

    await log({ type: 'steps', value: 10000 });
    const afterFirst = await User.findById(userId);

    const second = await log({ type: 'steps', value: 5000 });
    expect(second.body.data.challengesCompleted).toHaveLength(0);

    const afterSecond = await User.findById(userId);
    // Only the activity points for the second log, no second 500.
    expect(afterSecond.totalPoints - afterFirst.totalPoints).toBeLessThan(500);
  });

  // "Every day for a week" is seven daily wins, not seven times the value.
  it('counts qualifying days for a frequency target', async () => {
    const challenge = await makeChallenge({
      createdBy: userId,
      target: { type: 'frequency', value: 8, unit: 'glasses' },
      duration: 3
    });
    await auth(request(app).post(`/api/challenges/${challenge._id}/join`));

    const today = new Date();
    const yesterday = new Date(Date.now() - DAY_MS);

    await log({ type: 'water', value: 8, at: today.toISOString() });
    await log({ type: 'water', value: 3, at: yesterday.toISOString() }); // below the bar

    const res = await auth(request(app).get('/api/challenges/mine'));
    const progress = res.body.data.challenges[0].progress;

    expect(progress.current).toBe(1);
    expect(progress.goal).toBe(3);
  });

  it('measures nothing for a challenge whose unit has no metric', async () => {
    const user = await User.findById(userId);
    const challenge = await makeChallenge({
      createdBy: userId,
      target: { type: 'count', value: 5, unit: 'unicorns' }
    });

    const progress = await progressFor(user, challenge, { joinedAt: challenge.startDate });
    expect(progress.current).toBe(0);
  });
});

describe('achievement unlocking', () => {
  let token;
  let userId;

  beforeEach(async () => {
    const registered = await registerUser();
    token = registered.token;
    userId = registered.user._id;

    await Achievement.create({
      title: 'Hydration Hero',
      description: 'Drink 8 glasses in a day',
      icon: 'droplet',
      category: 'health',
      type: 'progress',
      rarity: 'common',
      points: 75,
      experiencePoints: 75,
      isActive: true,
      isPublic: true,
      criteria: { target: 'water', operator: '>=', value: 8 }
    });
  });

  const auth = (req) => req.set('Authorization', `Bearer ${token}`);
  const log = (payload) => auth(request(app).post('/api/health/activities')).send(payload);

  it('unlocks an achievement when its criteria are met', async () => {
    const res = await log({ type: 'water', value: 8 });

    expect(res.body.data.achievementsUnlocked).toHaveLength(1);
    expect(res.body.data.achievementsUnlocked[0].title).toBe('Hydration Hero');
  });

  it('does not unlock while the criteria are unmet', async () => {
    const res = await log({ type: 'water', value: 3 });
    expect(res.body.data.achievementsUnlocked).toHaveLength(0);
  });

  // Re-running the evaluator must never double-award.
  it('is idempotent once unlocked', async () => {
    await log({ type: 'water', value: 8 });
    const second = await log({ type: 'water', value: 8 });

    expect(second.body.data.achievementsUnlocked).toHaveLength(0);

    const user = await User.findById(userId);
    expect(user.achievements).toHaveLength(1);
  });

  it('awards the achievement points', async () => {
    const before = await User.findById(userId);
    await log({ type: 'water', value: 8 });
    const after = await User.findById(userId);

    expect(after.totalPoints).toBeGreaterThanOrEqual(before.totalPoints + 75);
  });

  it('ignores an achievement outside its availability window', async () => {
    await Achievement.create({
      title: 'Expired',
      description: 'No longer available',
      icon: 'clock',
      category: 'health',
      type: 'progress',
      rarity: 'common',
      points: 10,
      experiencePoints: 10,
      isActive: true,
      availableTo: new Date(Date.now() - DAY_MS),
      criteria: { target: 'water', operator: '>=', value: 1 }
    });

    const res = await log({ type: 'water', value: 8 });
    const titles = res.body.data.achievementsUnlocked.map((a) => a.title);

    expect(titles).toContain('Hydration Hero');
    expect(titles).not.toContain('Expired');
  });
});
