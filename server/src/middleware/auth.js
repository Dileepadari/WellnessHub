const jwt = require('jsonwebtoken');
const User = require('../models/User');
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

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

// Optional auth - user may or may not be authenticated
const optionalAuth = async (req, res, next) => {
  let token;

  // Get token from header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      const user = await User.findById(decoded.id).select('-password');

      if (user && user.isActive) {
        req.user = user;
      }
    } catch (error) {
      // Token invalid, but continue without user
      logger.debug('Optional auth failed:', error.message);
    }
  }

  next();
};

// Rate limiting for specific actions
const rateLimitByUser = (maxRequests = 10, windowMs = 15 * 60 * 1000) => {
  const userRequests = new Map();

  return (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const userId = req.user._id.toString();
    const now = Date.now();
    const windowStart = now - windowMs;

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
};

// Middleware to check if user owns resource
const checkOwnership = (Model, paramName = 'id', userField = 'userId') => {
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

      // Check if user owns the resource
      const resourceUserId = resource[userField]?.toString() || resource.createdBy?.toString();
      const currentUserId = req.user._id.toString();

      if (resourceUserId !== currentUserId) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this resource'
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      logger.error('Ownership check error:', error.message);
      return res.status(400).json({
        success: false,
        message: 'Error checking resource ownership'
      });
    }
  };
};

// Middleware to check team membership
const checkTeamMembership = (allowedRoles = ['member', 'captain', 'admin']) => {
  return async (req, res, next) => {
    try {
      const teamId = req.params.teamId;
      const user = req.user;

      // Check if user is member of the team
      const teamMembership = user.teams.find(
        team => team.teamId.toString() === teamId && 
        allowedRoles.includes(team.role)
      );

      if (!teamMembership) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this team resource'
        });
      }

      req.teamMembership = teamMembership;
      next();
    } catch (error) {
      logger.error('Team membership check error:', error.message);
      return res.status(400).json({
        success: false,
        message: 'Error checking team membership'
      });
    }
  };
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
  authorize,
  optionalAuth,
  rateLimitByUser,
  checkOwnership,
  checkTeamMembership,
  validateResource
};