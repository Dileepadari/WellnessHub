const request = require('supertest');
const { app, registerUser } = require('./helpers');

describe('wealth module', () => {
  let token;

  beforeEach(async () => {
    ({ token } = await registerUser());
  });

  const auth = (req) => req.set('Authorization', `Bearer ${token}`);
  const record = (payload) => auth(request(app).post('/api/wealth/transactions')).send(payload);
  const summary = () => auth(request(app).get('/api/wealth/summary'));

  it('lists valid categories per kind', async () => {
    const res = await request(app).get('/api/wealth/categories');

    expect(res.status).toBe(200);
    expect(res.body.data.expense).toContain('housing');
    expect(res.body.data.income).toContain('salary');
  });

  it('records income and expense', async () => {
    const income = await record({ kind: 'income', amount: 5000, category: 'salary' });
    const expense = await record({ kind: 'expense', amount: 1200, category: 'housing' });

    expect(income.status).toBe(201);
    expect(expense.status).toBe(201);
  });

  // The category list differs by kind; an income category on an expense is invalid.
  it('rejects a category that does not belong to the kind', async () => {
    const res = await record({ kind: 'expense', amount: 100, category: 'salary' });
    expect(res.status).toBe(400);
  });

  it('rejects a zero or negative amount', async () => {
    expect((await record({ kind: 'expense', amount: 0, category: 'food' })).status).toBe(400);
    expect((await record({ kind: 'expense', amount: -50, category: 'food' })).status).toBe(400);
  });

  it('computes net and savings rate from the recorded transactions', async () => {
    await record({ kind: 'income', amount: 5000, category: 'salary' });
    await record({ kind: 'expense', amount: 2000, category: 'housing' });

    const res = await summary();

    expect(res.body.data.income).toBe(5000);
    expect(res.body.data.expenses).toBe(2000);
    expect(res.body.data.net).toBe(3000);
    expect(res.body.data.savingsRate).toBe(60);
  });

  it('reports a null savings rate when there is no income to divide by', async () => {
    await record({ kind: 'expense', amount: 100, category: 'food' });

    const res = await summary();
    expect(res.body.data.savingsRate).toBeNull();
  });

  it('breaks spend down by category, largest first', async () => {
    await record({ kind: 'expense', amount: 900, category: 'housing' });
    await record({ kind: 'expense', amount: 120, category: 'food' });
    await record({ kind: 'expense', amount: 80, category: 'food' });

    const res = await summary();
    const [first, second] = res.body.data.categories;

    expect(first).toMatchObject({ category: 'housing', total: 900, count: 1 });
    expect(second).toMatchObject({ category: 'food', total: 200, count: 2 });
  });

  it('removes a deleted transaction from the totals', async () => {
    const created = await record({ kind: 'expense', amount: 500, category: 'food' });
    const id = created.body.data.transaction._id;

    await auth(request(app).delete(`/api/wealth/transactions/${id}`)).expect(200);

    const res = await summary();
    expect(res.body.data.expenses).toBe(0);
  });

  it('will not delete another user\'s transaction', async () => {
    const created = await record({ kind: 'expense', amount: 500, category: 'food' });
    const other = await registerUser({ username: 'intruder', email: 'intruder@example.com' });

    const res = await request(app)
      .delete(`/api/wealth/transactions/${created.body.data.transaction._id}`)
      .set('Authorization', `Bearer ${other.token}`);

    expect(res.status).toBe(404);
  });
});

describe('wealth goals', () => {
  let token;

  beforeEach(async () => {
    ({ token } = await registerUser());
  });

  const auth = (req) => req.set('Authorization', `Bearer ${token}`);

  const createGoal = (overrides = {}) =>
    auth(request(app).post('/api/wealth/goals')).send({
      title: 'Emergency fund',
      targetValue: 1000,
      ...overrides
    });

  it('creates a goal that starts at zero progress', async () => {
    const res = await createGoal();

    expect(res.status).toBe(201);
    expect(res.body.data.goal.currentValue).toBe(0);
    expect(res.body.data.goal.progress).toBe(0);
  });

  // Progress is the sum of contributions, never a stored counter, so it cannot
  // drift away from the underlying records.
  it('derives progress from contributions', async () => {
    const goal = (await createGoal()).body.data.goal;

    await auth(request(app).post(`/api/wealth/goals/${goal._id}/contributions`)).send({
      amount: 250
    });
    const second = await auth(
      request(app).post(`/api/wealth/goals/${goal._id}/contributions`)
    ).send({ amount: 250 });

    expect(second.body.data.goal.currentValue).toBe(500);
    expect(second.body.data.goal.progress).toBe(50);
  });

  it('marks a goal achieved once it reaches its target', async () => {
    const goal = (await createGoal()).body.data.goal;

    const res = await auth(
      request(app).post(`/api/wealth/goals/${goal._id}/contributions`)
    ).send({ amount: 1000 });

    expect(res.body.data.goal.status).toBe('achieved');
    expect(res.body.data.goal.progress).toBe(100);
  });

  it('rejects a goal with no title', async () => {
    const res = await createGoal({ title: '' });
    expect(res.status).toBe(400);
  });

  it('404s when contributing to a goal that is not yours', async () => {
    const goal = (await createGoal()).body.data.goal;
    const other = await registerUser({ username: 'intruder', email: 'intruder@example.com' });

    const res = await request(app)
      .post(`/api/wealth/goals/${goal._id}/contributions`)
      .set('Authorization', `Bearer ${other.token}`)
      .send({ amount: 100 });

    expect(res.status).toBe(404);
  });
});
