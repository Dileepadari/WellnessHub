const request = require('supertest');
const createApp = require('../src/app');

const app = createApp();

const DEFAULT_USER = {
  username: 'wellness_user',
  email: 'user@example.com',
  password: 'sup3rsecret',
  firstName: 'Ada',
  lastName: 'Lovelace'
};

/** Registers a user and returns its token and body, for tests that need a session. */
const registerUser = async (overrides = {}) => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ ...DEFAULT_USER, ...overrides });

  if (res.status !== 201) {
    throw new Error(`Test user registration failed: ${res.status} ${JSON.stringify(res.body)}`);
  }

  return { token: res.body.data.token, user: res.body.data.user, body: res.body };
};

module.exports = { app, registerUser, DEFAULT_USER };
