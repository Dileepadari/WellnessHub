const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('./config/env');
const logger = require('./utils/logger');
const Team = require('./models/Team');
const User = require('./models/User');

const userRoom = (userId) => `user-${userId}`;
const challengeRoom = (challengeId) => `challenge-${challengeId}`;
const teamRoom = (teamId) => `team-${teamId}`;

/**
 * Creates the Socket.IO server and wires up room handling.
 *
 * Clients authenticate with the same JWT they use for the REST API, passed as
 * `auth.token` on the connection. Unauthenticated sockets are rejected, so a
 * socket can only ever join its own user room.
 */
const createSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigins,
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.debug(`Socket connected: ${socket.id} (user ${socket.userId})`);

    // The user room is joined from the verified token, never from client input.
    socket.join(userRoom(socket.userId));

    socket.on('join-challenge', (challengeId) => {
      if (challengeId) socket.join(challengeRoom(challengeId));
    });

    socket.on('leave-challenge', (challengeId) => {
      if (challengeId) socket.leave(challengeRoom(challengeId));
    });

    // REST refuses to add you to a team that is not public, so subscribing to
    // its room must refuse too. Without this check a signed-in stranger could
    // not join a private or corporate team but could still sit in its room and
    // watch who did.
    socket.on('join-team', async (teamId) => {
      if (!teamId) return;
      try {
        const team = await Team.findById(teamId).select('type members');
        if (!team) return;

        const isMember = team.members.some(
          (m) => m.status === 'active' && m.userId.toString() === socket.userId
        );

        if (team.type !== 'public' && !isMember) {
          logger.debug(`Socket ${socket.id} refused room for team ${teamId}`);
          return;
        }

        socket.join(teamRoom(teamId));
      } catch (error) {
        logger.error(`join-team failed for ${teamId}`, error.message);
      }
    });

    socket.on('leave-team', (teamId) => {
      if (teamId) socket.leave(teamRoom(teamId));
    });

    socket.on('activity-update', async (data = {}) => {
      if (!data.activity) return;
      try {
        // Attributed to the authenticated user, so a client cannot post as
        // someone else. Sent to that user's friends and followers, the same
        // audience POST /api/community/share uses: broadcasting it to every
        // connected socket is what the event name already said it did not do.
        const sender = await User.findById(socket.userId).select('friends followers');
        if (!sender) return;

        const audience = new Set(
          [...sender.followers, ...sender.friends].map((id) => id.toString())
        );

        const payload = {
          userId: socket.userId,
          activity: data.activity,
          timestamp: new Date().toISOString()
        };

        audience.forEach((id) => io.to(userRoom(id)).emit('friend-activity', payload));
      } catch (error) {
        logger.error(`activity-update failed for ${socket.userId}`, error.message);
      }
    });

    socket.on('typing-start', (data = {}) => {
      if (data.teamId) {
        socket.to(teamRoom(data.teamId)).emit('user-typing', { userId: socket.userId });
      }
    });

    socket.on('typing-stop', (data = {}) => {
      if (data.teamId) {
        socket.to(teamRoom(data.teamId)).emit('user-stopped-typing', { userId: socket.userId });
      }
    });

    socket.on('error', (error) => {
      logger.error(`Socket error on ${socket.id}`, error);
    });

    socket.on('disconnect', (reason) => {
      logger.debug(`Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
};

module.exports = { createSocketServer, userRoom, challengeRoom, teamRoom };
