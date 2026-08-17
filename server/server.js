#!/usr/bin/env node

/**
 * WellnessHub API bootstrap.
 *
 * Owns everything with a side effect: the database connection, the HTTP
 * listener, Socket.IO, and process-level signal handling. src/app.js stays
 * free of all of it so it can be mounted directly in tests.
 */

const { createServer } = require('http');

const config = require('./src/config/env');
const connectDB = require('./src/config/database');
const { disconnectDB } = require('./src/config/database');
const createApp = require('./src/app');
const { createSocketServer } = require('./src/socket');
const logger = require('./src/utils/logger');

const start = async () => {
  await connectDB();

  const app = createApp();
  const httpServer = createServer(app);
  const io = createSocketServer(httpServer);

  // Routes reach the Socket.IO instance with req.app.get('io').
  app.set('io', io);

  httpServer.on('error', (error) => {
    if (error.syscall !== 'listen') throw error;
    if (error.code === 'EACCES') {
      logger.error(`Port ${config.port} requires elevated privileges`);
      process.exit(1);
    }
    if (error.code === 'EADDRINUSE') {
      logger.error(`Port ${config.port} is already in use`);
      process.exit(1);
    }
    throw error;
  });

  await new Promise((resolve) => httpServer.listen(config.port, resolve));

  logger.info(
    `WellnessHub API listening on port ${config.port} ` +
      `(env: ${config.nodeEnv}, docs: /api-docs, health: /health)`
  );

  let shuttingDown = false;
  const shutdown = async (signal) => {
    // A second Ctrl-C should not start a second teardown.
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} received, shutting down gracefully`);

    // Force exit if a connection refuses to drain, so an orchestrator's
    // SIGKILL is never what actually stops us.
    const timer = setTimeout(() => {
      logger.error('Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, 10000).unref();

    try {
      io.close();
      await new Promise((resolve) => httpServer.close(resolve));
      await disconnectDB();
      clearTimeout(timer);
      logger.info('Shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', reason);
    shutdown('unhandledRejection');
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', error);
    // The process is in an unknown state, so exit without draining.
    process.exit(1);
  });

  return { app, httpServer, io };
};

start().catch((error) => {
  logger.error('Failed to start server', error);
  process.exit(1);
});
