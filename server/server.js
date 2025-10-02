#!/usr/bin/env node

/**
 * WellnessHub Backend Server
 * Entry point for the WellnessHub API server
 */

const { server } = require('./src/app');
const logger = require('./src/utils/logger');

// Handle startup errors
server.on('error', (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const port = process.env.PORT || 5000;
  const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

  // Handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      logger.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});

// Handle server listening event
server.on('listening', () => {
  const addr = server.address();
  const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
  logger.info(`🎯 WellnessHub API listening on ${bind}`);
});