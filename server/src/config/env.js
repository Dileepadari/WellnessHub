const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Env files are loaded from the server directory first, then the repo root.
// dotenv does not overwrite already-set keys, so the server-local file wins and
// real process environment (Docker, CI) wins over both.
const candidates = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env')
];

for (const file of candidates) {
  if (fs.existsSync(file)) {
    dotenv.config({ path: file, quiet: true });
  }
}

const required = ['MONGODB_URI', 'JWT_SECRET'];

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const isTest = nodeEnv === 'test';

// Fail fast on a misconfigured deployment rather than crashing later on the
// first request. Tests supply their own in-memory values.
const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0 && !isTest) {
  throw new Error(
    `Missing required environment variable(s): ${missing.join(', ')}. ` +
      'Copy .env.example to .env and fill them in.'
  );
}

if (isProduction && process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-in-production-environment') {
  throw new Error('JWT_SECRET is still the example value. Set a real secret before deploying.');
}

const config = {
  nodeEnv,
  isProduction,
  isTest,
  isDevelopment: nodeEnv === 'development',

  port: toInt(process.env.PORT, 5000),
  apiVersion: process.env.API_VERSION || '1.0.0',

  mongoUri: process.env.MONGODB_URI,

  jwtSecret: process.env.JWT_SECRET,
  jwtExpire: process.env.JWT_EXPIRE || '7d',

  // Comma-separated list, so a deployment can add its own domains without a code change.
  corsOrigins: (process.env.CORS_ORIGIN || process.env.CLIENT_URL || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  rateLimit: {
    windowMs: toInt(process.env.RATE_LIMIT_WINDOW, 15) * 60 * 1000,
    max: toInt(process.env.RATE_LIMIT_MAX, isProduction ? 100 : 1000)
  },

  logLevel: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  logDir: process.env.LOG_DIR || path.resolve(__dirname, '../../logs')
};

module.exports = config;
