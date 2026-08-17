const { computeStreaks, shiftDay } = require('../src/services/streaks');

/**
 * Streaks are derived from the days that have activity rather than stored as a
 * counter, so these cases pin the derivation itself. `shiftDay(n)` is the key
 * for n days ago, which keeps the fixtures independent of today's date.
 */
describe('computeStreaks', () => {
  it('returns zeros when nothing has been logged', () => {
    expect(computeStreaks([])).toEqual({ current: 0, longest: 0, lastActiveDay: null });
  });

  it('counts a run ending today', () => {
    const days = [shiftDay(0), shiftDay(1), shiftDay(2)];
    expect(computeStreaks(days).current).toBe(3);
  });

  // A streak should not break just because today has not been logged yet.
  it('tolerates an unlogged today and counts back from yesterday', () => {
    const days = [shiftDay(1), shiftDay(2), shiftDay(3)];
    expect(computeStreaks(days).current).toBe(3);
  });

  it('breaks once a whole day is missed', () => {
    const days = [shiftDay(2), shiftDay(3), shiftDay(4)];
    expect(computeStreaks(days).current).toBe(0);
  });

  it('keeps the longest run even after the current one breaks', () => {
    const days = [shiftDay(10), shiftDay(11), shiftDay(12), shiftDay(13), shiftDay(0)];
    const result = computeStreaks(days);

    expect(result.current).toBe(1);
    expect(result.longest).toBe(4);
  });

  it('ignores duplicate days', () => {
    const days = [shiftDay(0), shiftDay(0), shiftDay(1)];
    expect(computeStreaks(days).current).toBe(2);
  });

  it('reports the most recent active day', () => {
    const days = [shiftDay(5), shiftDay(2), shiftDay(9)];
    expect(computeStreaks(days).lastActiveDay).toBe(shiftDay(2));
  });

  it('handles a single logged day', () => {
    expect(computeStreaks([shiftDay(0)])).toMatchObject({ current: 1, longest: 1 });
  });
});
