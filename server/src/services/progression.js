const Challenge = require('../models/Challenge');
const { syncParticipant } = require('./challenges');
const { evaluate } = require('./achievements');
const { streaksForUser } = require('./streaks');
const { userRoom } = require('../socket');
const logger = require('../utils/logger');

/**
 * The single "something happened" hook.
 *
 * Logging an activity can move a challenge, unlock an achievement and extend a
 * streak all at once. Rather than have each route remember that, every write
 * that could affect progression calls this once and it fans out.
 *
 * `io` is optional so tests and scripts can call it without a socket server.
 */
const recompute = async (user, { io } = {}) => {
  const result = { streaks: null, challengesCompleted: [], achievementsUnlocked: [] };

  try {
    // Challenges the user has joined and not yet finished.
    const active = (user.activeChallenges || [])
      .filter((entry) => !entry.completed && entry.challengeId)
      .map((entry) => entry.challengeId.toString());

    if (active.length > 0) {
      const challenges = await Challenge.find({ _id: { $in: active } });
      for (const challenge of challenges) {
        const synced = await syncParticipant(user, challenge);
        if (synced?.justCompleted) {
          result.challengesCompleted.push({ id: challenge._id, title: challenge.title });
        }
      }
    }

    // Achievements are evaluated after challenges, so completing a challenge can
    // immediately satisfy a "complete your first challenge" criterion.
    result.achievementsUnlocked = (await evaluate(user)).map((a) => ({
      id: a._id,
      title: a.title,
      points: a.points
    }));

    result.streaks = await streaksForUser(user._id);
    user.currentStreak = result.streaks.current;
    user.longestStreak = Math.max(result.streaks.longest, user.longestStreak || 0);
    await user.save();

    if (io) {
      const room = userRoom(user._id);
      for (const challenge of result.challengesCompleted) {
        io.to(room).emit('challenge-completed', challenge);
      }
      for (const achievement of result.achievementsUnlocked) {
        io.to(room).emit('achievement-unlocked', achievement);
      }
      // A generic nudge the client uses to refetch, whatever changed.
      io.to(room).emit('progression-updated', {
        totalPoints: user.totalPoints,
        level: user.level,
        streaks: result.streaks
      });
    }
  } catch (error) {
    // Progression is a side effect of the user's actual write. If it fails, the
    // write still stands - log it rather than failing the request.
    logger.error('Progression recompute failed', error);
  }

  return result;
};

module.exports = { recompute };
