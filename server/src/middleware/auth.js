const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/env');
const logger = require('../utils/logger');

// Protect routes - require authentication
const protect = async (req, res, next) => {
  let token;

  // Get token from header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret);

    // Get user from token
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'No user found with this token'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated'
      });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

// Populates req.user when a valid token is present and is a no-op otherwise.
// Routes that are readable anonymously but show more to a signed-in viewer use
// this: without it req.user is always undefined there, and any branch that
// tests it is dead code.
const optionalAuth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next();
  }

  try {
    const decoded = jwt.verify(header.slice(7), config.jwtSecret);
    const user = await User.findById(decoded.id).select('-password');
    if (user && user.isActive) {
      req.user = user;
    }
  } catch {
    // An invalid token on an optional route is the same as no token. Routes
    // that must reject it use protect instead.
  }

  next();
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }

    next();
  };
};

// Rate limiting for specific actions
const rateLimitByUser = (maxRequests = 10, windowMs = 15 * 60 * 1000) => {
  const userRequests = new Map();
  let lastSweep = Date.now();

  // A user's entry is only ever revisited when that same user comes back, so
  // someone who makes one request and never returns would sit in the map for
  // the life of the process. Windows here go up to 24 hours, so that is a long
  // time to hold an entry per user who ever touched the route. Sweeping the
  // whole map once per window keeps it proportional to recent traffic rather
  // than to every user who has ever signed in. No timer, so nothing to unref
  // and nothing that keeps the process alive.
  const sweep = (now) => {
    lastSweep = now;
    const cutoff = now - windowMs;
    for (const [id, times] of userRequests) {
      if (times.length === 0 || times[times.length - 1] <= cutoff) {
        userRequests.delete(id);
      }
    }
  };

  const middleware = (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const userId = req.user._id.toString();
    const now = Date.now();
    const windowStart = now - windowMs;

    if (now - lastSweep >= windowMs) {
      sweep(now);
    }

    // Clean old entries
    if (userRequests.has(userId)) {
      const requests = userRequests.get(userId).filter(time => time > windowStart);
      userRequests.set(userId, requests);
    } else {
      userRequests.set(userId, []);
    }

    const userRequestList = userRequests.get(userId);

    if (userRequestList.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: `Too many requests. Maximum ${maxRequests} requests per ${windowMs / 1000 / 60} minutes.`,
        retryAfter: Math.ceil((userRequestList[0] + windowMs - now) / 1000)
      });
    }

    userRequestList.push(now);
    next();
  };

  // Exposed so the leak that prompted the sweep can be asserted on directly.
  middleware.trackedUsers = () => userRequests.size;
  middleware.sweepNow = () => sweep(Date.now());

  return middleware;
};

// Middleware to validate resource exists
const validateResource = (Model, paramName = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[paramName];
      const resource = await Model.findById(resourceId);

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid resource ID'
        });
      }

      logger.error('Resource validation error:', error.message);
      return res.status(400).json({
        success: false,
        message: 'Error validating resource'
      });
    }
  };
};

module.exports = {
  protect,
  optionalAuth,
  authorize,
  rateLimitByUser,
  validateResource
};