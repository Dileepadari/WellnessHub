const Activity = require('../models/Activity');

const DAY_MS = 24 * 60 * 60 * 1000;

const dayKey = (date) => Activity.toDayKey(date);

/** The key for `offset` days before today (offset 1 = yesterday). */
const shiftDay = (offset) => dayKey(new Date(Date.now() - offset * DAY_MS));

/**
 * Streaks are derived from the days that actually have activity, not from a
 * stored counter. A counter drifts whenever an entry is backdated or deleted;
 * recomputing from the log is always right.
 *
 * The current streak counts back from today, and tolerates today being empty so
 * far - a streak is only broken once a whole day passes with nothing logged.
 */
const computeStreaks = (days) => {
  if (!days.length) return { current: 0, longest: 0, lastActiveDay: null };

  const present = new Set(days);
  const sorted = [...days].sort();

  let current = 0;
  // Start from today if it has activity, otherwise from yesterday, so an
  // as-yet-unlogged today does not read as a broken streak.
  let cursor = present.has(shiftDay(0)) ? 0 : 1;
  while (present.has(shiftDay(cursor))) {
    current += 1;
    cursor += 1;
  }

  let longest = 0;
  let run = 0;
  let previous = null;
  for (const day of sorted) {
    if (previous && new Date(day) - new Date(previous) === DAY_MS) {
      run += 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    previous = day;
  }

  return { current, longest, lastActiveDay: sorted[sorted.length - 1] };
};

/** Reads the user's active days and returns their streak figures. */
const streaksForUser = async (userId) => {
  const days = await Activity.activeDays(userId);
  return computeStreaks(days);
};

module.exports = { computeStreaks, streaksForUser, shiftDay };
