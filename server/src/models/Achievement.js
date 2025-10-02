const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Achievement title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Achievement description is required'],
    maxlength: [300, 'Description cannot exceed 300 characters']
  },
  
  // Visual Elements
  icon: {
    type: String,
    required: [true, 'Achievement icon is required']
  },
  color: {
    type: String,
    default: '#5D5CDE'
  },
  image: {
    type: String // URL to achievement image/badge
  },

  // Classification
  category: {
    type: String,
    required: [true, 'Achievement category is required'],
    enum: {
      values: ['health', 'wealth', 'insurance', 'social', 'streak', 'level', 'challenge', 'milestone'],
      message: 'Category must be one of: health, wealth, insurance, social, streak, level, challenge, milestone'
    }
  },
  subcategory: {
    type: String
  },
  type: {
    type: String,
    required: [true, 'Achievement type is required'],
    enum: {
      values: ['progress', 'milestone', 'streak', 'completion', 'social', 'special'],
      message: 'Type must be one of: progress, milestone, streak, completion, social, special'
    }
  },
  rarity: {
    type: String,
    required: [true, 'Achievement rarity is required'],
    enum: {
      values: ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'],
      message: 'Rarity must be one of: common, uncommon, rare, epic, legendary, mythic'
    }
  },

  // Reward System
  points: {
    type: Number,
    required: [true, 'Achievement points are required'],
    min: [1, 'Points must be at least 1']
  },
  experiencePoints: {
    type: Number,
    required: [true, 'Experience points are required'],
    min: [1, 'Experience points must be at least 1']
  },
  badge: {
    type: String // Special badge/title unlocked with this achievement
  },

  // Unlock Criteria
  criteria: {
    target: {
      type: String,
      required: [true, 'Achievement target is required'],
      enum: ['steps', 'water', 'workouts', 'savings', 'challenges', 'streak', 'level', 'friends', 'posts', 'custom']
    },
    operator: {
      type: String,
      required: [true, 'Achievement operator is required'],
      enum: ['>=', '>', '=', '<', '<=', 'in', 'between']
    },
    value: {
      type: mongoose.Schema.Types.Mixed, // Can be number, string, or array
      required: [true, 'Achievement value is required']
    },
    timeframe: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly', 'total', 'consecutive'],
      default: 'total'
    }
  },

  // Prerequisites
  prerequisites: [{
    achievementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Achievement'
    },
    required: {
      type: Boolean,
      default: true
    }
  }],

  // Series Information (for progressive achievements)
  series: {
    name: String, // e.g., "Step Master Series"
    order: Number, // Position in series (1, 2, 3, etc.)
    total: Number  // Total achievements in series
  },

  // Availability
  isActive: {
    type: Boolean,
    default: true
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  isSecret: {
    type: Boolean,
    default: false // Secret achievements are not visible until unlocked
  },
  availableFrom: Date,
  availableTo: Date,

  // Statistics
  stats: {
    totalUnlocked: { type: Number, default: 0 },
    uniqueUsers: { type: Number, default: 0 },
    firstUnlockedAt: Date,
    lastUnlockedAt: Date,
    averageTimeToUnlock: Number // in days
  },

  // Community Features
  featured: {
    type: Boolean,
    default: false
  },
  difficulty: {
    type: String,
    enum: ['trivial', 'easy', 'medium', 'hard', 'extreme', 'impossible'],
    default: 'medium'
  },

  // Metadata
  tags: [String],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
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
achievementSchema.index({ category: 1, type: 1 });
achievementSchema.index({ rarity: 1 });
achievementSchema.index({ isActive: 1, isPublic: 1 });
achievementSchema.index({ featured: -1 });
achievementSchema.index({ 'stats.totalUnlocked': -1 });
achievementSchema.index({ 'series.name': 1, 'series.order': 1 });

// Virtual for unlock percentage
achievementSchema.virtual('unlockPercentage').get(function() {
  // This would need to be calculated based on total users
  // For now, return a basic calculation
  return this.stats.totalUnlocked > 0 ? Math.min(100, this.stats.totalUnlocked / 100) : 0;
});

// Virtual for difficulty score
achievementSchema.virtual('difficultyScore').get(function() {
  const scores = {
    'trivial': 1,
    'easy': 2,
    'medium': 3,
    'hard': 4,
    'extreme': 5,
    'impossible': 6
  };
  return scores[this.difficulty] || 3;
});

// Method to check if user meets criteria
achievementSchema.methods.checkCriteria = function(userStats) {
  const { target, operator, value, timeframe } = this.criteria;
  
  // Get the relevant stat from user
  let userValue = userStats[target];
  
  if (userValue === undefined) {
    return false;
  }
  
  // Apply timeframe filtering if needed
  if (timeframe !== 'total') {
    // This would require more complex logic based on timeframe
    // For now, we'll use the total value
  }
  
  // Check the criteria
  switch (operator) {
    case '>=':
      return userValue >= value;
    case '>':
      return userValue > value;
    case '=':
      return userValue === value;
    case '<':
      return userValue < value;
    case '<=':
      return userValue <= value;
    case 'in':
      return Array.isArray(value) && value.includes(userValue);
    case 'between':
      return Array.isArray(value) && value.length === 2 && 
             userValue >= value[0] && userValue <= value[1];
    default:
      return false;
  }
};

// Method to update statistics when unlocked
achievementSchema.methods.onUnlocked = function(userId) {
  this.stats.totalUnlocked += 1;
  
  if (!this.stats.firstUnlockedAt) {
    this.stats.firstUnlockedAt = new Date();
  }
  this.stats.lastUnlockedAt = new Date();
  
  // Update unique users count (this would need more complex logic in real app)
  this.stats.uniqueUsers = this.stats.totalUnlocked; // Simplified
  
  return this.save();
};

// Static method to get achievements by category
achievementSchema.statics.getByCategory = function(category, includeSecret = false) {
  const query = {
    category,
    isActive: true,
    isPublic: true
  };
  
  if (!includeSecret) {
    query.isSecret = false;
  }
  
  return this.find(query).sort({ 'series.order': 1, points: 1 });
};

// Static method to get featured achievements
achievementSchema.statics.getFeatured = function(limit = 10) {
  return this.find({
    featured: true,
    isActive: true,
    isPublic: true,
    isSecret: false
  })
  .sort({ points: -1, createdAt: -1 })
  .limit(limit);
};

// Static method to get rare achievements
achievementSchema.statics.getRareAchievements = function(limit = 5) {
  return this.find({
    rarity: { $in: ['epic', 'legendary', 'mythic'] },
    isActive: true,
    isPublic: true
  })
  .sort({ points: -1, 'stats.totalUnlocked': 1 })
  .limit(limit);
};

// Static method to get achievements by series
achievementSchema.statics.getBySeries = function(seriesName) {
  return this.find({
    'series.name': seriesName,
    isActive: true
  }).sort({ 'series.order': 1 });
};

// Static method to check and unlock achievements for user
achievementSchema.statics.checkAndUnlockForUser = async function(userId, userStats) {
  const User = mongoose.model('User');
  const user = await User.findById(userId);
  
  if (!user) return [];
  
  // Get all active achievements that user hasn't unlocked yet
  const unlockedAchievementIds = user.achievements.map(a => a.achievementId.toString());
  const availableAchievements = await this.find({
    _id: { $nin: unlockedAchievementIds },
    isActive: true,
    $or: [
      { availableFrom: { $exists: false } },
      { availableFrom: { $lte: new Date() } }
    ],
    $or: [
      { availableTo: { $exists: false } },
      { availableTo: { $gte: new Date() } }
    ]
  });
  
  const newlyUnlocked = [];
  
  for (const achievement of availableAchievements) {
    // Check prerequisites
    let prerequisitesMet = true;
    for (const prereq of achievement.prerequisites) {
      const hasPrereq = user.achievements.some(
        a => a.achievementId.toString() === prereq.achievementId.toString()
      );
      if (prereq.required && !hasPrereq) {
        prerequisitesMet = false;
        break;
      }
    }
    
    if (!prerequisitesMet) continue;
    
    // Check criteria
    if (achievement.checkCriteria(userStats)) {
      // Unlock achievement
      await user.unlockAchievement(achievement._id);
      await achievement.onUnlocked(userId);
      newlyUnlocked.push(achievement);
    }
  }
  
  return newlyUnlocked;
};

module.exports = mongoose.model('Achievement', achievementSchema);