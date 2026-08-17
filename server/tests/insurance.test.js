const request = require('supertest');
const { app, registerUser } = require('./helpers');

const DAY_MS = 24 * 60 * 60 * 1000;
const inDays = (n) => new Date(Date.now() + n * DAY_MS).toISOString();

describe('insurance module', () => {
  let token;

  beforeEach(async () => {
    ({ token } = await registerUser());
  });

  const auth = (req) => req.set('Authorization', `Bearer ${token}`);

  const addPolicy = (overrides = {}) =>
    auth(request(app).post('/api/insurance/policies')).send({
      type: 'health',
      provider: 'BlueShield',
      coverageAmount: 100000,
      premium: 200,
      premiumFrequency: 'monthly',
      renewalDate: inDays(200),
      ...overrides
    });

  it('adds a policy', async () => {
    const res = await addPolicy();

    expect(res.status).toBe(201);
    expect(res.body.data.policy.provider).toBe('BlueShield');
  });

  it('rejects an unknown policy type', async () => {
    const res = await addPolicy({ type: 'spaceship' });
    expect(res.status).toBe(400);
  });

  it('requires a renewal date', async () => {
    const res = await addPolicy({ renewalDate: undefined });
    expect(res.status).toBe(400);
  });

  // Premiums on different billing cycles are only comparable once annualised.
  it.each([
    ['monthly', 200, 2400],
    ['quarterly', 200, 800],
    ['semi-annual', 200, 400],
    ['annual', 200, 200]
  ])('annualises a %s premium', async (premiumFrequency, premium, expected) => {
    const res = await addPolicy({ premiumFrequency, premium });
    expect(res.body.data.policy.annualPremium).toBe(expected);
  });

  it('totals coverage and annual premium across active policies', async () => {
    await addPolicy({ coverageAmount: 100000, premium: 100, premiumFrequency: 'monthly' });
    await addPolicy({ type: 'auto', coverageAmount: 50000, premium: 300, premiumFrequency: 'annual' });

    const res = await auth(request(app).get('/api/insurance/policies'));

    expect(res.body.data.summary.active).toBe(2);
    expect(res.body.data.summary.totalCoverage).toBe(150000);
    expect(res.body.data.summary.totalAnnualPremium).toBe(1500);
  });

  it('raises a renewal alert for a policy expiring soon', async () => {
    await addPolicy({ renewalDate: inDays(10) });

    const res = await auth(request(app).get('/api/insurance/alerts'));
    const renewal = res.body.data.alerts.find((alert) => alert.kind === 'renewal');

    expect(renewal).toBeDefined();
    expect(renewal.daysUntil).toBeLessThanOrEqual(10);
    expect(renewal.severity).toBe('high');
  });

  it('marks a lapsed policy as overdue', async () => {
    await addPolicy({ renewalDate: inDays(-5) });

    const res = await auth(request(app).get('/api/insurance/alerts'));
    expect(res.body.data.alerts[0].kind).toBe('overdue');
  });

  it('reports a gap for each essential cover that is missing', async () => {
    await addPolicy({ type: 'health' });

    const res = await auth(request(app).get('/api/insurance/alerts'));
    const gaps = res.body.data.alerts.filter((alert) => alert.kind === 'gap');

    // health is held, so life and auto remain.
    expect(gaps.map((gap) => gap.insuranceType).sort()).toEqual(['auto', 'life']);
  });

  it('does not raise a renewal alert outside the window', async () => {
    await addPolicy({ renewalDate: inDays(300) });

    const res = await auth(request(app).get('/api/insurance/alerts'));
    expect(res.body.data.alerts.some((alert) => alert.kind === 'renewal')).toBe(false);
  });

  it('scores coverage higher as essential policies are added', async () => {
    const empty = await auth(request(app).get('/api/insurance/coverage'));
    expect(empty.body.data.score).toBe(0);

    await addPolicy({ type: 'health' });
    await addPolicy({ type: 'life' });
    await addPolicy({ type: 'auto' });

    const full = await auth(request(app).get('/api/insurance/coverage'));
    expect(full.body.data.score).toBeGreaterThanOrEqual(60);
    expect(full.body.data.essentialsMissing).toEqual([]);
  });

  it('will not delete another user\'s policy', async () => {
    const created = await addPolicy();
    const other = await registerUser({ username: 'intruder', email: 'intruder@example.com' });

    const res = await request(app)
      .delete(`/api/insurance/policies/${created.body.data.policy._id}`)
      .set('Authorization', `Bearer ${other.token}`);

    expect(res.status).toBe(404);
  });
});
