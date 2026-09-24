const request = require('supertest');
const { app, registerUser } = require('./helpers');
const Transaction = require('../src/models/Transaction');

/**
 * The dashboard's monthly wealth series drives the Overview sparkline, which
 * needs more than one point to draw. Scoped to the dashboard period it held a
 * single bucket on the default 30d window whatever the account's history.
 */
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

const seedMonths = async (userId, months) => {
  const rows = [];
  for (let i = 0; i < months; i += 1) {
    const at = new Date(Date.now() - i * MONTH_MS - 2 * 24 * 60 * 60 * 1000);
    rows.push(
      { user: userId, kind: 'income', amount: 5000, category: 'salary', at, description: 'Salary' },
      { user: userId, kind: 'expense', amount: 1800, category: 'housing', at, description: 'Rent' }
    );
  }
  await Transaction.insertMany(rows);
};

const seriesFor = async (token, period) => {
  const res = await request(app)
    .get(`/api/analytics/dashboard${period ? `?period=${period}` : ''}`)
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  return res.body.data.wealth.series;
};

describe('dashboard wealth series', () => {
  it('spans several months on the default period', async () => {
    const { user, token } = await registerUser();
    await seedMonths(user._id, 4);

    // Bound to the 30-day period this was one bucket, so the Overview's
    // "net position by month" sparkline never had two points to join.
    expect((await seriesFor(token)).length).toBeGreaterThan(1);
  });

  it('does not shrink when the period shrinks', async () => {
    const { user, token } = await registerUser();
    await seedMonths(user._id, 4);

    const week = await seriesFor(token, '7d');
    const quarter = await seriesFor(token, '90d');

    // The series has its own window; the period governs the health totals.
    expect(week).toEqual(quarter);
  });

  it('is ordered oldest first', async () => {
    const { user, token } = await registerUser();
    await seedMonths(user._id, 4);

    const series = await seriesFor(token);
    const months = series.map((s) => s.month);

    expect(months).toEqual([...months].sort());
  });

  it('is empty for an account with no transactions', async () => {
    const { token } = await registerUser();
    expect(await seriesFor(token)).toEqual([]);
  });

  it('still rejects a period it does not support', async () => {
    const { token } = await registerUser();
    const res = await request(app)
      .get('/api/analytics/dashboard?period=1y')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });
});
