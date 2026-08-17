const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('./config/env');
const logger = require('./utils/logger');

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

    socket.on('join-team', (teamId) => {
      if (teamId) socket.join(teamRoom(teamId));
    });

    socket.on('leave-team', (teamId) => {
      if (teamId) socket.leave(teamRoom(teamId));
    });

    socket.on('activity-update', (data = {}) => {
      if (!data.activity) return;
      // Attributed to the authenticated user, so a client cannot post as someone else.
      socket.broadcast.emit('friend-activity', {
        userId: socket.userId,
        activity: data.activity,
        timestamp: new Date().toISOString()
      });
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
