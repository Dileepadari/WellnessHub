const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Import database connection
const connectDB = require('./config/database');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const gamificationRoutes = require('./routes/gamification');
const healthRoutes = require('./routes/health');
const wealthRoutes = require('./routes/wealth');
const insuranceRoutes = require('./routes/insurance');
const challengeRoutes = require('./routes/challenges');
const communityRoutes = require('./routes/community');
const analyticsRoutes = require('./routes/analytics');

// Import utilities
const logger = require('./utils/logger');
const swaggerSetup = require('./config/swagger');

const app = express();

// Create HTTP server
const server = createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Make io available to routes
app.set('io', io);

// Connect to database
connectDB();

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS middleware
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.CLIENT_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:3001',
      'https://wellnesshub.app' // Production domain
    ];
    
    // Allow requests with no origin (mobile apps, curl requests, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
} else {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Limit each IP to 100 requests per windowMs in production
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/health';
  }
});

app.use('/api', limiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/wealth', wealthRoutes);
app.use('/api/insurance', insuranceRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/analytics', analyticsRoutes);

// Setup Swagger documentation
swaggerSetup(app);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'WellnessHub API is healthy',
    timestamp: new Date().toISOString(),
    version: process.env.API_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'WellnessHub API',
    version: process.env.API_VERSION || '1.0.0',
    documentation: '/api/docs',
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

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);
  
  // Handle user authentication for socket
  socket.on('authenticate', (data) => {
    if (data.userId) {
      socket.join(`user-${data.userId}`);
      logger.info(`User ${data.userId} joined their personal room`);
    }
  });
  
  // Handle joining challenge rooms
  socket.on('join-challenge', (challengeId) => {
    socket.join(`challenge-${challengeId}`);
    logger.info(`Socket ${socket.id} joined challenge room: ${challengeId}`);
  });
  
  // Handle joining team rooms
  socket.on('join-team', (teamId) => {
    socket.join(`team-${teamId}`);
    logger.info(`Socket ${socket.id} joined team room: ${teamId}`);
  });
  
  // Handle leaving rooms
  socket.on('leave-challenge', (challengeId) => {
    socket.leave(`challenge-${challengeId}`);
    logger.info(`Socket ${socket.id} left challenge room: ${challengeId}`);
  });
  
  socket.on('leave-team', (teamId) => {
    socket.leave(`team-${teamId}`);
    logger.info(`Socket ${socket.id} left team room: ${teamId}`);
  });
  
  // Handle real-time activity updates
  socket.on('activity-update', (data) => {
    // Broadcast activity updates to followers/friends
    if (data.userId && data.activity) {
      socket.to(`user-${data.userId}`).emit('friend-activity', {
        userId: data.userId,
        activity: data.activity,
        timestamp: new Date()
      });
    }
  });
  
  // Handle typing indicators for team chat (future feature)
  socket.on('typing-start', (data) => {
    if (data.teamId) {
      socket.to(`team-${data.teamId}`).emit('user-typing', {
        userId: data.userId,
        username: data.username
      });
    }
  });
  
  socket.on('typing-stop', (data) => {
    if (data.teamId) {
      socket.to(`team-${data.teamId}`).emit('user-stopped-typing', {
        userId: data.userId
      });
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', (reason) => {
    logger.info(`Socket disconnected: ${socket.id}, reason: ${reason}`);
  });
  
  // Handle connection errors
  socket.on('error', (error) => {
    logger.error(`Socket error: ${error.message}`);
  });
});

// Handle 404 for API routes
app.use(/^\/api\/.*/, (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  server.close(() => {
    process.exit(1);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  logger.info(`
🚀 WellnessHub API Server started successfully!
📍 Environment: ${process.env.NODE_ENV || 'development'}
🌐 Server: http://localhost:${PORT}
📋 Health Check: http://localhost:${PORT}/health
📚 API Docs: http://localhost:${PORT}/api
⚡ Socket.IO: WebSocket server running
📊 Database: ${process.env.MONGODB_URI ? 'Connected' : 'Local'}
🔒 CORS Origin: ${process.env.CLIENT_URL || 'http://localhost:3000'}
  `);
});

// Export for testing
module.exports = { app, server, io };