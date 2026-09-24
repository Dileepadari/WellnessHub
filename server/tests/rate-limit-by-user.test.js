const { rateLimitByUser } = require('../src/middleware/auth');

/**
 * The per-user limiter keeps one array of timestamps per user in a closure.
 * These cover the limiting itself and the bookkeeping underneath it, which
 * grew without bound because an entry was only ever revisited when that same
 * user came back.
 */
const callWith = (middleware, id, times = 1) => {
  const responses = [];
  for (let i = 0; i < times; i += 1) {
    const req = { user: { _id: id } };
    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        responses.push({ status: this.statusCode, body });
        return this;
      }
    };
    let passed = false;
    middleware(req, res, () => {
      passed = true;
    });
    if (passed) responses.push({ status: 200 });
  }
  return responses;
};

describe('rateLimitByUser', () => {
  it('passes requests under the limit through', () => {
    const limiter = rateLimitByUser(3, 60_000);
    const results = callWith(limiter, 'user-a', 3);

    expect(results.every((r) => r.status === 200)).toBe(true);
  });

  it('rejects the request past the limit with a 429', () => {
    const limiter = rateLimitByUser(2, 60_000);
    const results = callWith(limiter, 'user-a', 3);

    expect(results[2].status).toBe(429);
    expect(results[2].body.retryAfter).toBeGreaterThan(0);
  });

  it('counts each user separately', () => {
    const limiter = rateLimitByUser(1, 60_000);

    expect(callWith(limiter, 'user-a', 1)[0].status).toBe(200);
    expect(callWith(limiter, 'user-b', 1)[0].status).toBe(200);
    expect(callWith(limiter, 'user-a', 1)[0].status).toBe(429);
  });

  it('skips an unauthenticated request without recording anything', () => {
    const limiter = rateLimitByUser(1, 60_000);
    let passed = false;
    limiter({}, {}, () => {
      passed = true;
    });

    expect(passed).toBe(true);
    expect(limiter.trackedUsers()).toBe(0);
  });

  it('forgets a user whose window has passed', () => {
    jest.useFakeTimers();
    try {
      const limiter = rateLimitByUser(5, 60_000);

      for (let i = 0; i < 200; i += 1) {
        callWith(limiter, `visitor-${i}`, 1);
      }
      expect(limiter.trackedUsers()).toBe(200);

      // Every one of those users is now outside the window. Before the sweep
      // their entries stayed in the map for the life of the process, because
      // an entry was only pruned when that same user made another request.
      jest.advanceTimersByTime(61_000);
      callWith(limiter, 'someone-else', 1);

      expect(limiter.trackedUsers()).toBe(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('keeps a user who is still inside the window', () => {
    jest.useFakeTimers();
    try {
      const limiter = rateLimitByUser(5, 60_000);

      callWith(limiter, 'early-bird', 1);
      jest.advanceTimersByTime(61_000);
      callWith(limiter, 'late-comer', 1);
      limiter.sweepNow();

      // The sweep drops stale entries, never live ones.
      expect(limiter.trackedUsers()).toBe(1);
      expect(callWith(limiter, 'late-comer', 1)[0].status).toBe(200);
    } finally {
      jest.useRealTimers();
    }
  });
});
