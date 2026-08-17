const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { rateLimit } = require('express-rate-limit');

const config = require('./config/env');
const swaggerSetup = require('./config/swagger');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const gamificationRoutes = require('./routes/gamification');
const healthRoutes = require('./routes/health');
const wealthRoutes = require('./routes/wealth');
const insuranceRoutes = require('./routes/insurance');
const challengeRoutes = require('./routes/challenges');
const communityRoutes = require('./routes/community');
const analyticsRoutes = require('./routes/analytics');

/**
 * Builds the Express application.
 *
 * This module deliberately does not listen, connect to the database, or install
 * process-level handlers - see server.js for that. Keeping it side-effect free
 * is what lets tests mount the app against an in-memory database.
 */
const createApp = () => {
  const app = express();

  // Required for express-rate-limit and req.ip to see the real client address
  // when running behind nginx or a platform load balancer.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'", 'ws:', 'wss:']
        }
      },
      crossOriginEmbedderPolicy: false
    })
  );

  app.use(
    cors({
      origin(origin, callback) {
        // Requests with no Origin header (curl, server-to-server, mobile) are allowed.
        if (!origin || config.corsOrigins.includes(origin)) {
          return callback(null, true);
        }
        callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    })
  );

  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Express 5 leaves req.body undefined when a request carries no body, so any
  // handler doing `const { x } = req.body` throws on a body-less POST. Several
  // routes take an entirely optional body (joining a challenge, claiming the
  // daily bonus), so normalise it once here rather than guarding 13 call sites.
  app.use((req, res, next) => {
    if (req.body === undefined) req.body = {};
    next();
  });

  if (!config.isTest) {
    app.use(
      morgan(config.isProduction ? 'combined' : 'dev', {
        stream: { write: (message) => logger.info(message.trim()) }
      })
    );
  }

  // Liveness probe, registered before the rate limiter so a busy API cannot
  // make an orchestrator think the process is dead.
  app.get('/health', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'WellnessHub API is healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: config.apiVersion,
      environment: config.nodeEnv
    });
  });

  app.use(
    '/api',
    rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.'
      },
      standardHeaders: true,
      legacyHeaders: false
    })
  );

  app.get('/api', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'WellnessHub API',
      version: config.apiVersion,
      documentation: '/api-docs',
      endpoints: {
        auth: '/api/auth',
        users: '/api/users',
        gamification: '/api/gamification',
        health: '/api/health',
        wealth: '/api/wealth',
        insurance: '/api/insurance',
        challenges: '/api/challenges',
        community: '/api/community',
        analytics: '/api/analytics'
      }
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/gamification', gamificationRoutes);
  app.use('/api/health', healthRoutes);
  app.use('/api/wealth', wealthRoutes);
  app.use('/api/insurance', insuranceRoutes);
  app.use('/api/challenges', challengeRoutes);
  app.use('/api/community', communityRoutes);
  app.use('/api/analytics', analyticsRoutes);

  swaggerSetup(app);

  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: 'Route not found',
      path: req.originalUrl,
      method: req.method
    });
  });

  app.use(errorHandler);

  return app;
};

module.exports = createApp;
