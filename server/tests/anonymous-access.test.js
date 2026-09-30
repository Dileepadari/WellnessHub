const request = require('supertest');
const { app, registerUser } = require('./helpers');

/**
 * Which endpoints answer a caller with no credentials.
 *
 * Six endpoints returned real first and last names to anyone who asked, with
 * no token: user search, three leaderboards, the per-challenge leaderboard and
 * the team list. None of them was ever reachable from the app that way - the
 * client renders `<AuthScreen />` until there is a user, and two of the six had
 * no caller at all - so they were a directory of the user base exposed for
 * nothing. Closed on 2026-09-30.
 *
 * The aggregate endpoint stays open deliberately: counts describe the service,
 * not the people in it. It is asserted here so that "public" stays a decision
 * rather than an oversight, and so the next person to add a public route has to
 * put it in this list on purpose.
 */

const NEEDS_A_TOKEN = [
  ['user search',              '/api/users/search?q=ali'],
  ['the user leaderboard',     '/api/users/leaderboard'],
  ['the community leaderboard','/api/community/leaderboard'],
  ['the team list',            '/api/community/teams'],
  ['the gamification leaderboard', '/api/gamification/leaderboard'],
  // Ordered before the resource lookup on purpose: an anonymous caller should
  // not learn whether a challenge id exists.
  ['a challenge leaderboard',  '/api/challenges/507f1f77bcf86cd799439011/leaderboard']
];

describe('endpoints that return user data', () => {
  it.each(NEEDS_A_TOKEN)('%s refuses an anonymous caller', async (_name, path) => {
    const res = await request(app).get(path);
    expect(res.status).toBe(401);
  });

  it.each(NEEDS_A_TOKEN)('%s answers a signed-in caller', async (_name, path) => {
    const { token } = await registerUser();

    const res = await request(app).get(path).set('Authorization', `Bearer ${token}`);

    // 404 is a pass here: the challenge id is a well-formed one that does not
    // exist. What matters is that the credential got the caller past the gate.
    expect([200, 404]).toContain(res.status);
  });
});

describe('endpoints that are public on purpose', () => {
  it('community stats answers anonymously, because it is only counts', async () => {
    const res = await request(app).get('/api/community/stats');

    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toMatch(/firstName|lastName|username/);
  });
});
