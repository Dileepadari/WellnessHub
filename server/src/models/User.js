const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic Information
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  avatar: {
    type: String,
    default: null
  },
  dateOfBirth: {
    type: Date
  },
  phoneNumber: {
    type: String,
    match: [/^\+?[\d\s-()]+$/, 'Please enter a valid phone number']
  },

  // Gamification System
  level: {
    type: Number,
    default: 1,
    min: 1
  },
  experience: {
    type: Number,
    default: 0,
    min: 0
  },
  totalPoints: {
    type: Number,
    default: 0,
    min: 0
  },
  availablePoints: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Streak System
  currentStreak: {
    type: Number,
    default: 0,
    min: 0
  },
  longestStreak: {
    type: Number,
    default: 0,
    min: 0
  },
  lastActivityDate: {
    type: Date,
    default: Date.now
  },

  // Achievement System
  achievements: [{
    achievementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Achievement'
    },
    unlockedAt: {
      type: Date,
      default: Date.now
    },
    progress: {
      type: Number,
      default: 0
    }
  }],

  // Health Metrics
  healthMetrics: {
    height: { type: Number }, // in cm
    weight: { type: Number }, // in kg
    targetWeight: { type: Number },
    dailyStepGoal: { type: Number, default: 10000 },
    dailyWaterGoal: { type: Number, default: 8 }, // glasses
    weeklyWorkoutGoal: { type: Number, default: 5 } // sessions
  },

  // Financial Metrics
  financialMetrics: {
    monthlyIncome: { type: Number },
    monthlySavingsGoal: { type: Number },
    emergencyFundGoal: { type: Number },
    creditScore: { type: Number },
    riskTolerance: {
      type: String,
      enum: ['conservative', 'moderate', 'aggressive'],
      default: 'moderate'
    }
  },

  // Insurance Information
  insuranceInfo: {
    healthInsurance: {
      provider: String,
      policyNumber: String,
      coverageAmount: Number,
      premium: Number,
      expirationDate: Date
    },
    lifeInsurance: {
      provider: String,
      policyNumber: String,
      coverageAmount: Number,
      premium: Number,
      expirationDate: Date
    },
    autoInsurance: {
      provider: String,
      policyNumber: String,
      vehicles: [{
        make: String,
        model: String,
        year: Number,
        vin: String
      }],
      premium: Number,
      expirationDate: Date
    }
  },

  // Social Features
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  followedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Team Memberships
  teams: [{
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    role: {
      type: String,
      enum: ['member', 'captain', 'admin'],
      default: 'member'
    }
  }],

  // Challenge Participation
  activeChallenges: [{
    challengeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Challenge'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    progress: {
      type: Number,
      default: 0
    },
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: Date
  }],

  // Preferences
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      achievements: { type: Boolean, default: true },
      challenges: { type: Boolean, default: true },
      social: { type: Boolean, default: true }
    },
    privacy: {
      profileVisibility: {
        type: String,
        enum: ['public', 'friends', 'private'],
        default: 'friends'
      },
      showRealName: { type: Boolean, default: false },
      showStats: { type: Boolean, default: true },
      showAchievements: { type: Boolean, default: true }
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    }
  },

  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,

  // Metadata
  lastLoginAt: Date,
  loginCount: {
    type: Number,
    default: 0
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
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ totalPoints: -1 });
userSchema.index({ level: -1 });
userSchema.index({ currentStreak: -1 });
userSchema.index({ createdAt: -1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for required XP for next level
userSchema.virtual('xpForNextLevel').get(function() {
  return this.level * 1000; // 1000 XP per level
});

// Virtual for progress to next level
userSchema.virtual('levelProgress').get(function() {
  const currentLevelXP = (this.level - 1) * 1000;
  const nextLevelXP = this.level * 1000;
  const progress = this.experience - currentLevelXP;
  const total = nextLevelXP - currentLevelXP;
  return Math.round((progress / total) * 100);
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash password if it's been modified
  if (!this.isModified('password')) return next();

  // Hash password with cost of 12
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Pre-save middleware to update level based on experience
userSchema.pre('save', function(next) {
  // Calculate level based on experience
  const newLevel = Math.floor(this.experience / 1000) + 1;
  
  // If level increased, we might want to trigger achievements
  if (newLevel > this.level) {
    this.level = newLevel;
    // Emit level up event (can be handled by achievement system)
    this.constructor.emit('levelUp', { user: this, newLevel });
  }
  
  next();
});

// Pre-save middleware to update streak
userSchema.pre('save', function(next) {
  const now = new Date();
  const lastActivity = new Date(this.lastActivityDate);
  const daysSinceLastActivity = Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24));
  
  if (daysSinceLastActivity === 1) {
    // Consecutive day - increment streak
    this.currentStreak += 1;
    if (this.currentStreak > this.longestStreak) {
      this.longestStreak = this.currentStreak;
    }
  } else if (daysSinceLastActivity > 1) {
    // Streak broken
    this.currentStreak = 1;
  }
  // If daysSinceLastActivity === 0, same day activity, no change to streak
  
  this.lastActivityDate = now;
  next();
});

// Method to compare password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to add points and experience
userSchema.methods.addPoints = function(points, reason = 'Activity completion') {
  this.totalPoints += points;
  this.availablePoints += points;
  this.experience += points; // XP = points in this system
  
  // Log point transaction (could be saved to separate collection)
  this.constructor.emit('pointsEarned', {
    user: this,
    points,
    reason,
    timestamp: new Date()
  });
  
  return this.save();
};

// Method to spend points
userSchema.methods.spendPoints = function(points, reason = 'Purchase') {
  if (this.availablePoints < points) {
    throw new Error('Insufficient points');
  }
  
  this.availablePoints -= points;
  
  // Log point transaction
  this.constructor.emit('pointsSpent', {
    user: this,
    points,
    reason,
    timestamp: new Date()
  });
  
  return this.save();
};

// Method to unlock achievement
userSchema.methods.unlockAchievement = function(achievementId, progress = 100) {
  const existingAchievement = this.achievements.find(
    a => a.achievementId.toString() === achievementId.toString()
  );
  
  if (!existingAchievement) {
    this.achievements.push({
      achievementId,
      progress,
      unlockedAt: new Date()
    });
    
    // Emit achievement unlocked event
    this.constructor.emit('achievementUnlocked', {
      user: this,
      achievementId,
      timestamp: new Date()
    });
  } else if (existingAchievement.progress < 100 && progress >= 100) {
    existingAchievement.progress = progress;
    existingAchievement.unlockedAt = new Date();
    
    this.constructor.emit('achievementUnlocked', {
      user: this,
      achievementId,
      timestamp: new Date()
    });
  } else {
    existingAchievement.progress = Math.max(existingAchievement.progress, progress);
  }
  
  return this.save();
};

// Static method to get leaderboard
userSchema.statics.getLeaderboard = function(limit = 10, category = 'totalPoints') {
  const sortField = {};
  sortField[category] = -1;
  
  return this.find({ isActive: true })
    .select('username firstName lastName avatar level totalPoints currentStreak')
    .sort(sortField)
    .limit(limit);
};

// Static method to get user rank
userSchema.statics.getUserRank = async function(userId, category = 'totalPoints') {
  const user = await this.findById(userId);
  if (!user) return null;
  
  const query = { isActive: true };
  query[category] = { $gt: user[category] };
  
  const rank = await this.countDocuments(query) + 1;
  return rank;
};

module.exports = mongoose.model('User', userSchema);