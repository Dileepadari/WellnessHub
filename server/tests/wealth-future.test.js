const request = require('supertest');
const { app, registerUser } = require('./helpers');

/**
 * The activity log refuses an entry dated ahead of now, because it would
 * corrupt today's totals and the streak. Transactions feed the month buckets,
 * the savings rate and the prior-month averages, and had no such rule.
 */
const record = (token, body) =>
  request(app)
    .post('/api/wealth/transactions')
    .set('Authorization', `Bearer ${token}`)
    .send({ kind: 'expense', amount: 42, category: 'food', ...body });

describe('POST /api/wealth/transactions', () => {
  it('records a transaction dated now', async () => {
    const { token } = await registerUser();
    const res = await record(token, {});
    expect(res.status).toBe(201);
  });

  it('records a transaction dated in the past', async () => {
    const { token } = await registerUser();
    const res = await record(token, { at: new Date(Date.now() - 86_400_000).toISOString() });
    expect(res.status).toBe(201);
  });

  it('refuses a transaction dated tomorrow', async () => {
    const { token } = await registerUser();
    const res = await record(token, { at: new Date(Date.now() + 86_400_000).toISOString() });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/future/i);
  });

  it('refuses a transaction dated years ahead', async () => {
    const { token } = await registerUser();
    const res = await record(token, { at: '2032-01-01T00:00:00.000Z' });

    // This landed in a 2032 month bucket and skewed every derived figure.
    expect(res.status).toBe(400);
  });

  it('keeps a future-dated transaction out of the summary', async () => {
    const { token } = await registerUser();
    await record(token, { at: new Date(Date.now() + 86_400_000).toISOString(), amount: 9999 });

    const res = await request(app)
      .get('/api/wealth/summary')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.expenses).toBe(0);
  });
});
