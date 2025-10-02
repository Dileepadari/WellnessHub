const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Challenge title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Challenge description is required'],
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  category: {
    type: String,
    required: [true, 'Challenge category is required'],
    enum: {
      values: ['health', 'wealth', 'insurance', 'wellness', 'community', 'learning'],
      message: 'Category must be one of: health, wealth, insurance, wellness, community, learning'
    }
  },
  subcategory: {
    type: String,
    required: false
  },
  type: {
    type: String,
    required: [true, 'Challenge type is required'],
    enum: {
      values: ['individual', 'team', 'community', 'global'],
      message: 'Type must be one of: individual, team, community, global'
    }
  },
  difficulty: {
    type: String,
    required: [true, 'Challenge difficulty is required'],
    enum: {
      values: ['easy', 'medium', 'hard', 'expert'],
      message: 'Difficulty must be one of: easy, medium, hard, expert'
    }
  },

  // Reward System
  points: {
    type: Number,
    required: [true, 'Challenge points are required'],
    min: [1, 'Points must be at least 1']
  },
  experiencePoints: {
    type: Number,
    required: [true, 'Experience points are required'],
    min: [1, 'Experience points must be at least 1']
  },
  badge: {
    type: String // Badge/achievement ID to unlock upon completion
  },

  // Time Management
  duration: {
    type: Number, // Duration in days
    required: [true, 'Challenge duration is required'],
    min: [1, 'Duration must be at least 1 day']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  timeZone: {
    type: String,
    default: 'UTC'
  },

  // Challenge Configuration
  target: {
    type: {
      type: String,
      enum: ['count', 'duration', 'amount', 'frequency', 'completion'],
      required: true
    },
    value: {
      type: Number,
      required: true
    },
    unit: {
      type: String // e.g., 'steps', 'minutes', 'dollars', 'times', 'tasks'
    }
  },

  // Participation Rules
  maxParticipants: {
    type: Number,
    default: null // null means unlimited
  },
  minParticipants: {
    type: Number,
    default: 1
  },
  autoJoin: {
    type: Boolean,
    default: false // Whether users are automatically enrolled
  },
  inviteOnly: {
    type: Boolean,
    default: false
  },

  // Creator Information
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  creatorType: {
    type: String,
    enum: ['user', 'admin', 'system', 'partner'],
    default: 'user'
  },

  // Team Configuration (for team challenges)
  teamSettings: {
    maxTeamSize: { type: Number, default: 5 },
    minTeamSize: { type: Number, default: 2 },
    allowJoinAfterStart: { type: Boolean, default: false }
  },

  // Progress Tracking
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    progress: {
      type: Number,
      default: 0,
      min: 0
    },
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: Date,
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team'
    }
  }],

  // Community Features
  featured: {
    type: Boolean,
    default: false
  },
  trending: {
    type: Boolean,
    default: false
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true,
      maxlength: 500
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Challenge Assets
  images: [{
    url: String,
    alt: String,
    type: {
      type: String,
      enum: ['cover', 'icon', 'gallery']
    }
  }],
  videos: [{
    url: String,
    title: String,
    duration: Number
  }],

  // Requirements and Instructions
  requirements: [{
    text: String,
    completed: { type: Boolean, default: false }
  }],
  instructions: {
    type: String,
    maxlength: 2000
  },
  tips: [String],

  // External Integration
  integrations: {
    healthApps: [String], // Array of supported health app names
    fitnessTrackers: [String],
    bankingApps: [String],
    insuranceApps: [String]
  },

  // Analytics
  stats: {
    totalParticipants: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 },
    averageProgress: { type: Number, default: 0 },
    totalPointsAwarded: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    views: { type: Number, default: 0 }
  },

  // Status
  status: {
    type: String,
    enum: ['draft', 'published', 'active', 'completed', 'cancelled', 'archived'],
    default: 'draft'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPublic: {
    type: Boolean,
    default: true
  },

  // Metadata
  tags: [String],
  version: {
    type: Number,
    default: 1
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
challengeSchema.index({ category: 1, status: 1 });
challengeSchema.index({ startDate: 1, endDate: 1 });
challengeSchema.index({ featured: -1, trending: -1 });
challengeSchema.index({ 'stats.totalParticipants': -1 });
challengeSchema.index({ createdAt: -1 });
challengeSchema.index({ tags: 1 });

// Virtual for participant count
challengeSchema.virtual('participantCount').get(function() {
  return this.participants.length;
});

// Virtual for completion rate
challengeSchema.virtual('completionRate').get(function() {
  if (this.participants.length === 0) return 0;
  const completed = this.participants.filter(p => p.completed).length;
  return Math.round((completed / this.participants.length) * 100);
});

// Virtual for days remaining
challengeSchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  const end = new Date(this.endDate);
  const diffTime = end - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
});

// Virtual for challenge status based on dates
challengeSchema.virtual('currentStatus').get(function() {
  const now = new Date();
  const start = new Date(this.startDate);
  const end = new Date(this.endDate);
  
  if (now < start) return 'upcoming';
  if (now > end) return 'completed';
  return 'active';
});

// Pre-save middleware to update stats
challengeSchema.pre('save', function(next) {
  if (this.isModified('participants')) {
    this.stats.totalParticipants = this.participants.length;
    
    const completed = this.participants.filter(p => p.completed).length;
    this.stats.completionRate = this.participants.length > 0 
      ? Math.round((completed / this.participants.length) * 100) 
      : 0;
    
    const totalProgress = this.participants.reduce((sum, p) => sum + p.progress, 0);
    this.stats.averageProgress = this.participants.length > 0 
      ? Math.round(totalProgress / this.participants.length) 
      : 0;
  }
  
  next();
});

// Pre-save middleware to set end date based on duration
challengeSchema.pre('save', function(next) {
  if (this.isModified('startDate') || this.isModified('duration')) {
    const startDate = new Date(this.startDate);
    this.endDate = new Date(startDate.getTime() + (this.duration * 24 * 60 * 60 * 1000));
  }
  next();
});

// Method to add participant
challengeSchema.methods.addParticipant = function(userId, teamId = null) {
  // Check if user is already participating
  const existingParticipant = this.participants.find(
    p => p.userId.toString() === userId.toString()
  );
  
  if (existingParticipant) {
    throw new Error('User is already participating in this challenge');
  }
  
  // Check max participants limit
  if (this.maxParticipants && this.participants.length >= this.maxParticipants) {
    throw new Error('Challenge has reached maximum participants');
  }
  
  // Check if challenge is still open for joining
  const now = new Date();
  if (this.type === 'team' && !this.teamSettings.allowJoinAfterStart && now > this.startDate) {
    throw new Error('Cannot join team challenge after it has started');
  }
  
  this.participants.push({
    userId,
    teamId,
    joinedAt: new Date()
  });
  
  return this.save();
};

// Method to update participant progress
challengeSchema.methods.updateProgress = function(userId, progress) {
  const participant = this.participants.find(
    p => p.userId.toString() === userId.toString()
  );
  
  if (!participant) {
    throw new Error('User is not participating in this challenge');
  }
  
  participant.progress = Math.min(progress, 100); // Cap at 100%
  
  // Mark as completed if progress reaches 100%
  if (participant.progress >= 100 && !participant.completed) {
    participant.completed = true;
    participant.completedAt = new Date();
    
    // Emit completion event
    this.constructor.emit('challengeCompleted', {
      challenge: this,
      userId,
      completedAt: participant.completedAt
    });
  }
  
  return this.save();
};

// Method to get leaderboard for this challenge
challengeSchema.methods.getLeaderboard = function(limit = 10) {
  return this.participants
    .sort((a, b) => {
      // Sort by completion first, then by progress, then by completion time
      if (a.completed !== b.completed) {
        return b.completed - a.completed;
      }
      if (a.progress !== b.progress) {
        return b.progress - a.progress;
      }
      if (a.completed && b.completed) {
        return new Date(a.completedAt) - new Date(b.completedAt);
      }
      return new Date(a.joinedAt) - new Date(b.joinedAt);
    })
    .slice(0, limit)
    .map((participant, index) => ({
      rank: index + 1,
      userId: participant.userId,
      progress: participant.progress,
      completed: participant.completed,
      completedAt: participant.completedAt,
      joinedAt: participant.joinedAt
    }));
};

// Static method to get trending challenges
challengeSchema.statics.getTrending = function(limit = 10) {
  return this.find({
    status: 'active',
    isActive: true,
    isPublic: true
  })
  .sort({ 'stats.totalParticipants': -1, createdAt: -1 })
  .limit(limit)
  .populate('createdBy', 'username firstName lastName avatar');
};

// Static method to get featured challenges
challengeSchema.statics.getFeatured = function(limit = 5) {
  return this.find({
    featured: true,
    status: 'active',
    isActive: true,
    isPublic: true
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .populate('createdBy', 'username firstName lastName avatar');
};

// Static method to get challenges by category
challengeSchema.statics.getByCategory = function(category, limit = 20) {
  return this.find({
    category,
    status: 'active',
    isActive: true,
    isPublic: true
  })
  .sort({ 'stats.totalParticipants': -1, createdAt: -1 })
  .limit(limit)
  .populate('createdBy', 'username firstName lastName avatar');
};

module.exports = mongoose.model('Challenge', challengeSchema);