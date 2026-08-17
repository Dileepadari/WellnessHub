const mongoose = require('mongoose');
const config = require('./env');
const logger = require('../utils/logger');

// Connection lifecycle listeners are attached once at module load. Attaching them
// inside connectDB would re-register them on every reconnect attempt.
mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error', err);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected');
});

const connectDB = async () => {
  const conn = await mongoose.connect(config.mongoUri, {
    serverSelectionTimeoutMS: 10000
  });
  logger.info(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  return conn;
};

const disconnectDB = async () => {
  await mongoose.connection.close();
  logger.info('MongoDB connection closed');
};

module.exports = connectDB;
module.exports.connectDB = connectDB;
module.exports.disconnectDB = disconnectDB;
