const request = require('supertest');
const createApp = require('../src/app');
const Activity = require('../src/models/Activity');
const { registerUser } = require('./helpers');

const app = createApp();

describe('service endpoints', () => {
  it('reports healthy on /health', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.environment).toBe('test');
  });

  it('returns a JSON 404 for an unknown route', async () => {
    const res = await request(app).get('/api/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('sets security headers and hides x-powered-by', async () => {
    const res = await request(app).get('/health');

    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  // Express 5 leaves req.body undefined for a body-less request; routes that
  // destructure an optional body would 500 without the normaliser in app.js.
  it('does not crash on a POST with no body', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
  });
});

describe('health module', () => {
  let token;

  beforeEach(async () => {
    ({ token } = await registerUser());
  });

  const log = (payload) =>
    request(app).post('/api/health/activities').set('Authorization', `Bearer ${token}`).send(payload);

  const summary = (days = 7) =>
    request(app).get(`/api/health/summary?days=${days}`).set('Authorization', `Bearer ${token}`);

  it('exposes metric definitions without auth', async () => {
    const res = await request(app).get('/api/health/metrics');

    expect(res.status).toBe(200);
    expect(res.body.data.metrics.steps).toMatchObject({ unit: 'steps', aggregate: 'sum' });
  });

  it('logs an activity and awards points', async () => {
    const res = await log({ type: 'steps', value: 8000 });

    expect(res.status).toBe(201);
    expect(res.body.data.activity.value).toBe(8000);
    expect(res.body.data.pointsEarned).toBeGreaterThan(0);
  });

  it('rejects an unknown metric type', async () => {
    const res = await log({ type: 'flying', value: 10 });
    expect(res.status).toBe(400);
  });

  it('rejects a negative value', async () => {
    const res = await log({ type: 'steps', value: -5 });
    expect(res.status).toBe(400);
  });

  // A future entry would inflate today's totals and corrupt the streak.
  it('rejects an activity dated in the future', async () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const res = await log({ type: 'steps', value: 100, at: tomorrow });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/future/i);
  });

  it('sums multiple same-day entries into one figure', async () => {
    await log({ type: 'steps', value: 3000 });
    await log({ type: 'steps', value: 2500 });

    const res = await summary();
    const steps = res.body.data.rows.find((row) => row.type === 'steps');

    expect(steps.value).toBe(5500);
    expect(steps.entries).toBe(2);
  });

  // Weight is a reading, not a quantity: the latest value stands, and it must
  // not be summed across entries.
  it('takes the latest reading for weight rather than summing', async () => {
    await log({ type: 'weight', value: 80 });
    await log({ type: 'weight', value: 78.5 });

    const res = await summary();
    const weight = res.body.data.rows.find((row) => row.type === 'weight');

    expect(weight.value).toBe(78.5);
  });

  it('reports progress against the user goal', async () => {
    await log({ type: 'water', value: 4 });

    const res = await summary();
    const water = res.body.data.rows.find((row) => row.type === 'water');

    expect(water.goal).toBe(8);
    expect(water.progress).toBe(50);
  });

  // A percentage bar is meaningless where the target is a level to reach.
  it('omits progress for metrics where lower is better', async () => {
    await log({ type: 'weight', value: 80 });

    const res = await summary();
    const weight = res.body.data.rows.find((row) => row.type === 'weight');

    expect(weight.progress).toBeNull();
  });

  it('returns one series point per day in the window', async () => {
    await log({ type: 'steps', value: 1000 });

    const res = await summary(14);
    const steps = res.body.data.rows.find((row) => row.type === 'steps');

    expect(steps.series).toHaveLength(14);
    expect(steps.series.at(-1).value).toBe(1000);
  });

  it('deletes an activity and drops it from the totals', async () => {
    const created = await log({ type: 'steps', value: 4000 });
    const id = created.body.data.activity._id;

    const del = await request(app)
      .delete(`/api/health/activities/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);

    const res = await summary();
    expect(res.body.data.rows.find((row) => row.type === 'steps').value).toBe(0);
  });

  it('will not delete another user\'s activity', async () => {
    const created = await log({ type: 'steps', value: 4000 });
    const id = created.body.data.activity._id;

    const other = await registerUser({ username: 'intruder', email: 'intruder@example.com' });
    const res = await request(app)
      .delete(`/api/health/activities/${id}`)
      .set('Authorization', `Bearer ${other.token}`);

    expect(res.status).toBe(404);
    expect(await Activity.countDocuments({ _id: id })).toBe(1);
  });

  it('updates goals and reflects them in the summary', async () => {
    const res = await request(app)
      .put('/api/health/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({ dailyStepGoal: 5000 });
    expect(res.status).toBe(200);

    const after = await summary();
    expect(after.body.data.rows.find((row) => row.type === 'steps').goal).toBe(5000);
  });

  it('rejects a goal update with no recognised fields', async () => {
    const res = await request(app)
      .put('/api/health/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({ nonsense: 1 });

    expect(res.status).toBe(400);
  });

  it('requires auth for the summary', async () => {
    const res = await request(app).get('/api/health/summary');
    expect(res.status).toBe(401);
  });
});
