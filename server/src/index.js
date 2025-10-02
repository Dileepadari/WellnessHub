const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit').rateLimit;
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const connectDB = require('./config/database');
const swaggerSetup = require('./config/swagger');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const healthRoutes = require('./routes/health');
const wealthRoutes = require('./routes/wealth');
const insuranceRoutes = require('./routes/insurance');
const challengeRoutes = require('./routes/challenges');
const communityRoutes = require('./routes/community');
const gamificationRoutes = require('./routes/gamification');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      scriptSrc: ["'self'"]
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000 || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Swagger API documentation
swaggerSetup(app);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/wealth', wealthRoutes);
app.use('/api/insurance', insuranceRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/analytics', analyticsRoutes);

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);

  // Join user to their personal room
  socket.on('join-user-room', (userId) => {
    socket.join(`user-${userId}`);
    logger.info(`User ${userId} joined their personal room`);
  });

  // Join challenge room
  socket.on('join-challenge', (challengeId) => {
    socket.join(`challenge-${challengeId}`);
    logger.info(`User joined challenge room: ${challengeId}`);
  });

  // Join team room
  socket.on('join-team', (teamId) => {
    socket.join(`team-${teamId}`);
    logger.info(`User joined team room: ${teamId}`);
  });

  // Handle real-time progress updates
  socket.on('progress-update', (data) => {
    // Broadcast to relevant rooms
    if (data.challengeId) {
      socket.to(`challenge-${data.challengeId}`).emit('challenge-progress', data);
    }
    if (data.teamId) {
      socket.to(`team-${data.teamId}`).emit('team-progress', data);
    }
  });

  // Handle achievement notifications
  socket.on('achievement-earned', (data) => {
    socket.to(`user-${data.userId}`).emit('new-achievement', data);
    // Broadcast to friends/followers
    if (data.shareWithCommunity) {
      socket.broadcast.emit('community-achievement', data);
    }
  });

  // Handle challenge completion
  socket.on('challenge-completed', (data) => {
    socket.to(`challenge-${data.challengeId}`).emit('challenge-completion', data);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.id}`);
  });
});

// Make io accessible to our routes
app.set('io', io);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  logger.info(`🏥 Health Check: http://localhost:${PORT}/health`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
  });
});

module.exports = { app, server, io };