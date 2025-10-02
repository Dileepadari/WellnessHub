const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Team name is required'],
    trim: true,
    maxlength: [50, 'Team name cannot exceed 50 characters'],
    unique: true
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  avatar: {
    type: String // Team logo/avatar URL
  },
  banner: {
    type: String // Team banner image URL
  },
  color: {
    type: String,
    default: '#5D5CDE' // Team theme color
  },

  // Team Configuration
  category: {
    type: String,
    required: [true, 'Team category is required'],
    enum: {
      values: ['health', 'wealth', 'insurance', 'wellness', 'mixed', 'corporate', 'community'],
      message: 'Category must be one of: health, wealth, insurance, wellness, mixed, corporate, community'
    }
  },
  type: {
    type: String,
    required: [true, 'Team type is required'],
    enum: {
      values: ['public', 'private', 'invite-only', 'corporate'],
      message: 'Type must be one of: public, private, invite-only, corporate'
    }
  },
  maxMembers: {
    type: Number,
    default: 50,
    min: [2, 'Team must have at least 2 members'],
    max: [500, 'Team cannot exceed 500 members']
  },

  // Leadership
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  leaders: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['captain', 'co-captain', 'admin'],
      default: 'captain'
    },
    appointedAt: {
      type: Date,
      default: Date.now
    },
    appointedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // Membership
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    role: {
      type: String,
      enum: ['member', 'veteran', 'rookie'],
      default: 'member'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'banned'],
      default: 'active'
    },
    contributions: {
      totalPoints: { type: Number, default: 0 },
      challengesCompleted: { type: Number, default: 0 },
      daysActive: { type: Number, default: 0 }
    }
  }],

  // Join Requests (for private/invite-only teams)
  joinRequests: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    message: {
      type: String,
      maxlength: 200
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }
  }],

  // Team Performance
  stats: {
    totalPoints: { type: Number, default: 0 },
    averagePoints: { type: Number, default: 0 },
    totalChallengesCompleted: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    memberRetentionRate: { type: Number, default: 100 },
    activityScore: { type: Number, default: 0 }
  },

  // Rankings
  rankings: {
    global: { type: Number, default: null },
    category: { type: Number, default: null },
    regional: { type: Number, default: null },
    monthly: { type: Number, default: null },
    weekly: { type: Number, default: null }
  },

  // Active Challenges
  activeChallenges: [{
    challengeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Challenge',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    teamProgress: {
      type: Number,
      default: 0
    },
    participatingMembers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: Date,
    rank: Number
  }],

  // Achievements
  achievements: [{
    achievementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Achievement',
      required: true
    },
    unlockedAt: {
      type: Date,
      default: Date.now
    },
    unlockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // Social Features
  posts: [{
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: 1000
    },
    images: [String],
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
    isPinned: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Team Events
  events: [{
    title: {
      type: String,
      required: true,
      maxlength: 100
    },
    description: {
      type: String,
      maxlength: 500
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: Date,
    type: {
      type: String,
      enum: ['challenge', 'meeting', 'competition', 'social', 'milestone'],
      required: true
    },
    attendees: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Team Settings
  settings: {
    allowMemberInvites: { type: Boolean, default: true },
    requireApprovalForJoin: { type: Boolean, default: false },
    allowMemberPosts: { type: Boolean, default: true },
    showMemberStats: { type: Boolean, default: true },
    autoKickInactive: { type: Boolean, default: false },
    inactivityThreshold: { type: Number, default: 30 }, // days
    welcomeMessage: { type: String, maxlength: 500 }
  },

  // Location (optional)
  location: {
    country: String,
    state: String,
    city: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },

  // Corporate Team Features
  corporate: {
    companyName: String,
    department: String,
    employeeCount: Number,
    isVerified: { type: Boolean, default: false },
    corporateId: String
  },

  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },

  // Metadata
  tags: [String],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastActivityAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
teamSchema.index({ name: 1 });
teamSchema.index({ category: 1, type: 1 });
teamSchema.index({ 'stats.totalPoints': -1 });
teamSchema.index({ isFeatured: -1, createdAt: -1 });
teamSchema.index({ 'location.country': 1, 'location.state': 1 });
teamSchema.index({ creator: 1 });
teamSchema.index({ tags: 1 });

// Virtual for member count
teamSchema.virtual('memberCount').get(function() {
  return this.members.filter(m => m.status === 'active').length;
});

// Virtual for active member count
teamSchema.virtual('activeMemberCount').get(function() {
  // Members active in last 7 days (this would need more complex logic)
  return this.members.filter(m => m.status === 'active').length;
});

// Virtual for join request count
teamSchema.virtual('pendingRequestCount').get(function() {
  return this.joinRequests.filter(r => r.status === 'pending').length;
});

// Virtual for team level (based on total points)
teamSchema.virtual('level').get(function() {
  return Math.floor(this.stats.totalPoints / 10000) + 1; // 10k points per level
});

// Pre-save middleware to update stats
teamSchema.pre('save', function(next) {
  // Update member count and average points
  const activeMembers = this.members.filter(m => m.status === 'active');
  
  if (activeMembers.length > 0) {
    const totalMemberPoints = activeMembers.reduce((sum, m) => sum + m.contributions.totalPoints, 0);
    this.stats.totalPoints = totalMemberPoints;
    this.stats.averagePoints = Math.round(totalMemberPoints / activeMembers.length);
    
    // Update activity score based on recent activity
    const activeMembersCount = activeMembers.length;
    const maxMembers = this.maxMembers;
    const memberActivityRatio = activeMembersCount / maxMembers;
    this.stats.activityScore = Math.round(memberActivityRatio * 100);
  }
  
  next();
});

// Method to add member
teamSchema.methods.addMember = function(userId, role = 'member') {
  // Check if user is already a member
  const existingMember = this.members.find(
    m => m.userId.toString() === userId.toString()
  );
  
  if (existingMember) {
    if (existingMember.status === 'banned') {
      throw new Error('User is banned from this team');
    }
    if (existingMember.status === 'inactive') {
      existingMember.status = 'active';
      existingMember.joinedAt = new Date();
      return this.save();
    }
    throw new Error('User is already a member of this team');
  }
  
  // Check team capacity
  const activeMembers = this.members.filter(m => m.status === 'active').length;
  if (activeMembers >= this.maxMembers) {
    throw new Error('Team has reached maximum capacity');
  }
  
  this.members.push({
    userId,
    role,
    joinedAt: new Date(),
    status: 'active'
  });
  
  // Remove from join requests if exists
  this.joinRequests = this.joinRequests.filter(
    r => r.userId.toString() !== userId.toString()
  );
  
  return this.save();
};

// Method to remove member
teamSchema.methods.removeMember = function(userId, reason = 'left') {
  const memberIndex = this.members.findIndex(
    m => m.userId.toString() === userId.toString()
  );
  
  if (memberIndex === -1) {
    throw new Error('User is not a member of this team');
  }
  
  // Check if removing creator/last leader
  const member = this.members[memberIndex];
  const isCreator = this.creator.toString() === userId.toString();
  const isLeader = this.leaders.some(l => l.userId.toString() === userId.toString());
  
  if (isCreator) {
    // Transfer ownership to another leader or senior member
    const otherLeaders = this.leaders.filter(l => l.userId.toString() !== userId.toString());
    if (otherLeaders.length > 0) {
      this.creator = otherLeaders[0].userId;
    } else {
      // Find senior member to promote
      const seniorMember = this.members
        .filter(m => m.userId.toString() !== userId.toString() && m.status === 'active')
        .sort((a, b) => new Date(a.joinedAt) - new Date(b.joinedAt))[0];
      
      if (seniorMember) {
        this.creator = seniorMember.userId;
        this.leaders.push({
          userId: seniorMember.userId,
          role: 'captain',
          appointedAt: new Date()
        });
      }
    }
  }
  
  // Remove from leaders if applicable
  this.leaders = this.leaders.filter(l => l.userId.toString() !== userId.toString());
  
  // Remove member
  if (reason === 'banned') {
    this.members[memberIndex].status = 'banned';
  } else {
    this.members.splice(memberIndex, 1);
  }
  
  return this.save();
};

// Method to join challenge as team
teamSchema.methods.joinChallenge = function(challengeId) {
  // Check if already participating
  const existingChallenge = this.activeChallenges.find(
    c => c.challengeId.toString() === challengeId.toString()
  );
  
  if (existingChallenge) {
    throw new Error('Team is already participating in this challenge');
  }
  
  this.activeChallenges.push({
    challengeId,
    joinedAt: new Date(),
    participatingMembers: this.members
      .filter(m => m.status === 'active')
      .map(m => m.userId)
  });
  
  return this.save();
};

// Method to update challenge progress
teamSchema.methods.updateChallengeProgress = function(challengeId, progress) {
  const challenge = this.activeChallenges.find(
    c => c.challengeId.toString() === challengeId.toString()
  );
  
  if (!challenge) {
    throw new Error('Team is not participating in this challenge');
  }
  
  challenge.teamProgress = Math.min(progress, 100);
  
  if (challenge.teamProgress >= 100 && !challenge.completed) {
    challenge.completed = true;
    challenge.completedAt = new Date();
    this.stats.totalChallengesCompleted += 1;
  }
  
  return this.save();
};

// Static method to get team leaderboard
teamSchema.statics.getLeaderboard = function(category = null, limit = 10) {
  const query = { isActive: true };
  if (category) {
    query.category = category;
  }
  
  return this.find(query)
    .select('name avatar category stats memberCount rankings')
    .sort({ 'stats.totalPoints': -1, createdAt: -1 })
    .limit(limit)
    .populate('creator', 'username firstName lastName');
};

// Static method to search teams
teamSchema.statics.searchTeams = function(searchTerm, filters = {}) {
  const query = {
    isActive: true,
    isPublic: true,
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { tags: { $in: [new RegExp(searchTerm, 'i')] } }
    ]
  };
  
  // Apply filters
  if (filters.category) query.category = filters.category;
  if (filters.type) query.type = filters.type;
  if (filters.location) {
    if (filters.location.country) query['location.country'] = filters.location.country;
    if (filters.location.state) query['location.state'] = filters.location.state;
  }
  
  return this.find(query)
    .sort({ 'stats.totalPoints': -1, memberCount: -1 })
    .limit(20);
};

module.exports = mongoose.model('Team', teamSchema);