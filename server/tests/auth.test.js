const request = require('supertest');
const User = require('../src/models/User');
const { app, DEFAULT_USER: validUser } = require('./helpers');

const register = (overrides = {}) =>
  request(app)
    .post('/api/auth/register')
    .send({ ...validUser, ...overrides });

describe('POST /api/auth/register', () => {
  it('creates a user and returns a token', async () => {
    const res = await register();

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user.email).toBe(validUser.email);
  });

  it('never returns the password hash', async () => {
    const res = await register();

    expect(res.body.data.user.password).toBeUndefined();
  });

  it('stores the password hashed, not in plain text', async () => {
    await register();

    const stored = await User.findOne({ email: validUser.email }).select('+password');
    expect(stored.password).toBeDefined();
    expect(stored.password).not.toBe(validUser.password);
  });

  it('rejects a duplicate email', async () => {
    await register();
    const res = await register({ username: 'someone_else' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects a duplicate username', async () => {
    await register();
    const res = await register({ email: 'other@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it.each([
    ['a malformed email', { email: 'not-an-email' }],
    ['a short password', { password: '123' }],
    ['a username with invalid characters', { username: 'has spaces!' }],
    ['a missing first name', { firstName: '' }]
  ])('rejects %s', async (_label, overrides) => {
    const res = await register(overrides);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await register();
  });

  it('returns a token for correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: validUser.password });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toEqual(expect.any(String));
  });

  it('rejects a wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects an unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: validUser.password });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the current user for a valid token', async () => {
    const { body } = await register();

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${body.data.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(validUser.email);
  });

  it('rejects a request with no token', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
  });

  it('rejects a malformed token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-real-token');

    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me with populated relations', () => {
  // Regression: /auth/me populates teams and challenges with a field projection.
  // The populated documents then lack the arrays their virtuals read, and
  // serialising them threw - which the handler reported as a 401 'Invalid token',
  // so every user belonging to a team was locked out on page load.
  it('returns the user when they belong to a team and a challenge', async () => {
    const Team = require('../src/models/Team');
    const Challenge = require('../src/models/Challenge');

    const { body } = await register();
    const userId = body.data.user._id;

    const team = await Team.create({
      name: 'Test Team',
      category: 'health',
      type: 'public',
      creator: userId,
      members: [{ userId, status: 'active' }]
    });

    const challenge = await Challenge.create({
      title: 'Test Challenge',
      description: 'A challenge used by the regression test',
      category: 'health',
      type: 'individual',
      difficulty: 'easy',
      points: 100,
      experiencePoints: 100,
      duration: 7,
      target: { type: 'count', value: 10, unit: 'steps' },
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdBy: userId
    });

    await User.findByIdAndUpdate(userId, {
      teams: [{ teamId: team._id, role: 'member' }],
      activeChallenges: [{ challengeId: challenge._id }]
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${body.data.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(validUser.email);
    expect(res.body.data.user.teams).toHaveLength(1);
    expect(res.body.data.user.activeChallenges).toHaveLength(1);
  });
});
