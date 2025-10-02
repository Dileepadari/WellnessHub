// MongoDB initialization script
db = db.getSiblingDB('wellnesshub');

// Create collections
db.createCollection('users');
db.createCollection('challenges');
db.createCollection('achievements');
db.createCollection('posts');
db.createCollection('teams');
db.createCollection('leaderboards');

// Create indexes for better performance
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "gamification.points": -1 });
db.users.createIndex({ "gamification.level": -1 });
db.users.createIndex({ "createdAt": 1 });

db.challenges.createIndex({ "category": 1 });
db.challenges.createIndex({ "difficulty": 1 });
db.challenges.createIndex({ "status": 1 });
db.challenges.createIndex({ "startDate": 1, "endDate": 1 });

db.achievements.createIndex({ "userId": 1 });
db.achievements.createIndex({ "type": 1 });
db.achievements.createIndex({ "unlockedAt": -1 });

db.posts.createIndex({ "author": 1 });
db.posts.createIndex({ "createdAt": -1 });
db.posts.createIndex({ "likes": -1 });

db.teams.createIndex({ "members": 1 });
db.teams.createIndex({ "createdAt": -1 });

// Insert sample challenges
db.challenges.insertMany([
  {
    title: "Daily Steps Champion",
    description: "Walk 10,000 steps every day for a week",
    category: "health",
    type: "steps",
    target: 70000,
    duration: 7,
    points: 500,
    difficulty: "medium",
    badge: "steps_champion",
    isActive: true,
    createdAt: new Date()
  },
  {
    title: "Water Warrior",
    description: "Drink 8 glasses of water daily for 5 days",
    category: "health",
    type: "hydration",
    target: 40,
    duration: 5,
    points: 300,
    difficulty: "easy",
    badge: "hydration_hero",
    isActive: true,
    createdAt: new Date()
  },
  {
    title: "Savings Superstar",
    description: "Save $100 this month",
    category: "wealth",
    type: "savings",
    target: 100,
    duration: 30,
    points: 1000,
    difficulty: "hard",
    badge: "savings_star",
    isActive: true,
    createdAt: new Date()
  },
  {
    title: "Budget Tracker Pro",
    description: "Track all expenses for 14 days",
    category: "wealth",
    type: "budgeting",
    target: 14,
    duration: 14,
    points: 400,
    difficulty: "medium",
    badge: "budget_pro",
    isActive: true,
    createdAt: new Date()
  },
  {
    title: "Policy Review Master",
    description: "Review and update your insurance policies",
    category: "insurance",
    type: "policy_review",
    target: 1,
    duration: 1,
    points: 200,
    difficulty: "easy",
    badge: "policy_master",
    isActive: true,
    createdAt: new Date()
  }
]);

// Insert sample achievements
db.achievements.insertMany([
  {
    name: "First Steps",
    description: "Complete your first challenge",
    type: "milestone",
    badge: "first_steps",
    points: 100,
    rarity: "common",
    requirements: { challenges_completed: 1 }
  },
  {
    name: "Streak Master",
    description: "Maintain a 7-day activity streak",
    type: "streak",
    badge: "streak_master",
    points: 500,
    rarity: "rare",
    requirements: { max_streak: 7 }
  },
  {
    name: "Community Leader",
    description: "Get 100 likes on your posts",
    type: "social",
    badge: "community_leader",
    points: 750,
    rarity: "epic",
    requirements: { total_likes: 100 }
  },
  {
    name: "Wellness Guru",
    description: "Reach level 10",
    type: "level",
    badge: "wellness_guru",
    points: 1000,
    rarity: "legendary",
    requirements: { level: 10 }
  },
  {
    name: "Team Player",
    description: "Join your first team",
    type: "social",
    badge: "team_player",
    points: 150,
    rarity: "common",
    requirements: { teams_joined: 1 }
  }
]);

// Insert sample teams
db.teams.insertMany([
  {
    name: "Fitness Fanatics",
    description: "Dedicated to health and fitness goals",
    category: "health",
    isPublic: true,
    maxMembers: 50,
    members: [],
    totalPoints: 0,
    createdAt: new Date(),
    avatar: "fitness_team_avatar.png"
  },
  {
    name: "Money Masters",
    description: "Achieving financial wellness together",
    category: "wealth",
    isPublic: true,
    maxMembers: 30,
    members: [],
    totalPoints: 0,
    createdAt: new Date(),
    avatar: "money_team_avatar.png"
  },
  {
    name: "Wellness Warriors",
    description: "Complete wellness across all categories",
    category: "mixed",
    isPublic: true,
    maxMembers: 100,
    members: [],
    totalPoints: 0,
    createdAt: new Date(),
    avatar: "wellness_team_avatar.png"
  }
]);

print('Database initialized successfully with sample data!');