const request = require('supertest');
const { app, registerUser } = require('./helpers');
const User = require('../src/models/User');

/**
 * Covers the two /api/users endpoints that answered 404 for every caller, and
 * the search term that was handed to the regex engine verbatim.
 */
describe('GET /api/users/friends', () => {
  it('returns the friends list rather than being captured by /:id', async () => {
    const { token } = await registerUser();

    const res = await request(app)
      .get('/api/users/friends')
      .set('Authorization', `Bearer ${token}`);

    // Registered after /:id, this route was unreachable: Express matched
    // /:id first with id="friends" and the CastError became a 404.
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ friends: [], following: [], followers: 0 });
  });

  it('still requires a token', async () => {
    const res = await request(app).get('/api/users/friends');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/users/:id', () => {
  it('finds an active user', async () => {
    const { user } = await registerUser();

    const res = await request(app).get(`/api/users/${user._id}`);

    // isActive was left out of the projection, so the guard read undefined and
    // every profile, active or not, answered "User not found".
    expect(res.status).toBe(200);
    expect(res.body.data.username).toBe(user.username);
  });

  it('404s a deactivated user', async () => {
    const { user } = await registerUser();
    await User.findByIdAndUpdate(user._id, { isActive: false });

    const res = await request(app).get(`/api/users/${user._id}`);

    expect(res.status).toBe(404);
  });

  it('403s a private profile for a stranger', async () => {
    const { user } = await registerUser();
    await User.findByIdAndUpdate(user._id, {
      'preferences.privacy.profileVisibility': 'private'
    });

    const res = await request(app).get(`/api/users/${user._id}`);

    expect(res.status).toBe(403);
  });

  it('lets the owner read their own private profile', async () => {
    const { user, token } = await registerUser();
    await User.findByIdAndUpdate(user._id, {
      'preferences.privacy.profileVisibility': 'private'
    });

    const res = await request(app)
      .get(`/api/users/${user._id}`)
      .set('Authorization', `Bearer ${token}`);

    // The handler already tested req.user here, but the route had no auth
    // middleware at all, so req.user was always undefined and this was dead.
    expect(res.status).toBe(200);
    expect(res.body.data.username).toBe(user.username);
  });

  it('withholds the detail block from a stranger on the default setting', async () => {
    const { user } = await registerUser();
    const viewer = await registerUser({ username: 'viewer_1', email: 'v@example.com' });

    const res = await request(app)
      .get(`/api/users/${user._id}`)
      .set('Authorization', `Bearer ${viewer.token}`);

    expect(res.status).toBe(200);
    // Default visibility is 'friends' and these two are not friends.
    expect(res.body.data.teams).toBeUndefined();
    expect(res.body.data.achievements).toBeUndefined();
  });

  it('gives the detail block to an actual friend', async () => {
    const { user } = await registerUser();
    const viewer = await registerUser({ username: 'viewer_2', email: 'v2@example.com' });
    await User.findByIdAndUpdate(user._id, { $push: { friends: viewer.user._id } });

    const res = await request(app)
      .get(`/api/users/${user._id}`)
      .set('Authorization', `Bearer ${viewer.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.teams).toBeDefined();
  });
});

describe('GET /api/users/search', () => {
  beforeEach(async () => {
    await registerUser({ username: 'alice_w', email: 'a@example.com', firstName: 'Alice' });
    await registerUser({ username: 'bob_x', email: 'b@example.com', firstName: 'Bob' });
    await registerUser({ username: 'carol_y', email: 'c@example.com', firstName: 'Carol' });
  });

  it('matches a substring', async () => {
    const res = await request(app).get('/api/users/search?q=ali');

    expect(res.status).toBe(200);
    expect(res.body.data.map((u) => u.username)).toEqual(['alice_w']);
  });

  it('treats a regex metacharacter as a literal', async () => {
    const res = await request(app).get(`/api/users/search?q=${encodeURIComponent('.*')}`);

    // Passed through raw, this matched every document and returned the whole
    // user directory to a caller with no credentials.
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('does not let an anchored alternation widen the match', async () => {
    const res = await request(app).get(`/api/users/search?q=${encodeURIComponent('^(a|b)')}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('caps the page size a caller can ask for', async () => {
    // Inserted directly: sixty rounds of bcrypt through the register route
    // would dominate the suite's runtime and prove nothing extra.
    await User.insertMany(
      Array.from({ length: 60 }, (_, i) => ({
        username: `bulkuser${i}`,
        email: `bulk${i}@example.com`,
        password: 'hashed-elsewhere',
        firstName: 'Bulk',
        lastName: 'User'
      }))
    );

    const res = await request(app).get('/api/users/search?q=bulkuser&limit=100000');

    // limit went into .limit(parseInt(limit)) uncapped, so one request could
    // ask for the entire collection.
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(50);
  });
});
