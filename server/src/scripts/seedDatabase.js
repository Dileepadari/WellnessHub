/**
 * Database seeding script for WellnessHub
 * Creates initial data for development and testing
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Achievement = require('../models/Achievement');
const Challenge = require('../models/Challenge');
const Team = require('../models/Team');

const connectDB = require('../config/database');

const seedData = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Connect to database
    await connectDB();
    
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Achievement.deleteMany({}),
      Challenge.deleteMany({}),
      Team.deleteMany({})
    ]);
    
    // Create achievements
    console.log('🏆 Creating achievements...');
    const achievements = [
      {
        title: 'Welcome to WellnessHub',
        description: 'Complete your profile setup',
        category: 'milestone',
        type: 'milestone',
        points: 100,
        experiencePoints: 100,
        icon: '🎉',
        rarity: 'common',
        criteria: {
          target: 'custom',
          operator: '>=',
          value: 1,
          timeframe: 'total'
        },
        isActive: true
      },
      {
        title: 'First Steps',
        description: 'Log your first 1000 steps',
        category: 'health',
        type: 'milestone',
        points: 50,
        experiencePoints: 50,
        icon: '👟',
        rarity: 'common',
        criteria: {
          target: 'steps',
          operator: '>=',
          value: 1000,
          timeframe: 'total'
        },
        isActive: true
      },
      {
        title: 'Hydration Hero',
        description: 'Drink 8 glasses of water in a day',
        category: 'health',
        type: 'progress',
        points: 75,
        experiencePoints: 75,
        icon: '💧',
        rarity: 'common',
        criteria: {
          target: 'water',
          operator: '>=',
          value: 8,
          timeframe: 'daily'
        },
        isActive: true
      },
      {
        title: 'Financial Planner',
        description: 'Set your first financial goal',
        category: 'wealth',
        type: 'milestone',
        points: 100,
        experiencePoints: 100,
        icon: '💰',
        rarity: 'common',
        criteria: {
          target: 'custom',
          operator: '>=',
          value: 1,
          timeframe: 'total'
        },
        isActive: true
      },
      {
        title: 'Team Player',
        description: 'Join your first team',
        category: 'social',
        type: 'social',
        points: 150,
        experiencePoints: 150,
        icon: '🤝',
        rarity: 'common',
        criteria: {
          target: 'friends',
          operator: '>=',
          value: 1,
          timeframe: 'total'
        },
        isActive: true
      },
      {
        title: 'Challenge Champion',
        description: 'Complete your first challenge',
        category: 'challenge',
        type: 'completion',
        points: 200,
        experiencePoints: 200,
        icon: '🏅',
        rarity: 'rare',
        criteria: {
          target: 'challenges',
          operator: '>=',
          value: 1,
          timeframe: 'total'
        },
        isActive: true
      },
      {
        title: 'Streak Master',
        description: 'Maintain a 7-day activity streak',
        category: 'streak',
        type: 'streak',
        points: 300,
        experiencePoints: 300,
        icon: '🔥',
        rarity: 'epic',
        criteria: {
          target: 'streak',
          operator: '>=',
          value: 7,
          timeframe: 'consecutive'
        },
        isActive: true
      },
      {
        title: 'Wellness Guru',
        description: 'Reach level 10',
        category: 'level',
        type: 'milestone',
        points: 500,
        experiencePoints: 500,
        icon: '🧘',
        rarity: 'legendary',
        criteria: {
          target: 'level',
          operator: '>=',
          value: 10,
          timeframe: 'total'
        },
        isActive: true
      }
    ];
    
    await Achievement.insertMany(achievements);
    console.log(`✅ Created ${achievements.length} achievements`);
    
    // Create sample users
    console.log('👥 Creating sample users...');
    const users = [
      {
        username: 'admin',
        email: 'admin@wellnesshub.app',
        password: 'Admin123!',
        firstName: 'Admin',
        lastName: 'User',
        isEmailVerified: true,
        totalPoints: 5000,
        level: 5,
        experience: 5000,
        currentStreak: 30,
        longestStreak: 45
      },
      {
        username: 'john_doe',
        email: 'john@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        isEmailVerified: true,
        totalPoints: 2500,
        level: 3,
        experience: 2500,
        currentStreak: 15,
        longestStreak: 20,
        healthMetrics: {
          height: 175,
          weight: 70,
          targetWeight: 68,
          dailyStepGoal: 10000,
          dailyWaterGoal: 8,
          weeklyWorkoutGoal: 5
        }
      },
      {
        username: 'jane_smith',
        email: 'jane@example.com',
        password: 'Password123!',
        firstName: 'Jane',
        lastName: 'Smith',
        isEmailVerified: true,
        totalPoints: 3200,
        level: 4,
        experience: 3200,
        currentStreak: 22,
        longestStreak: 35,
        financialMetrics: {
          monthlyIncome: 5000,
          monthlySavingsGoal: 1500,
          emergencyFundGoal: 15000,
          creditScore: 750,
          riskTolerance: 'moderate'
        }
      },
      {
        username: 'demo',
        email: 'demo@wellnesshub.app',
        password: 'Demo123!',
        firstName: 'Demo',
        lastName: 'User',
        isEmailVerified: true,
        totalPoints: 1000,
        level: 2,
        experience: 1000,
        currentStreak: 5,
        longestStreak: 10
      }
    ];
    
    // Create users one by one to trigger pre-save hooks for password hashing
    const createdUsers = [];
    for (const userData of users) {
      const user = await User.create(userData);
      createdUsers.push(user);
    }
    console.log(`✅ Created ${createdUsers.length} users`);
    
    // Create sample challenges
    console.log('🎯 Creating sample challenges...');
    const challenges = [
      {
        title: '10,000 Steps Daily',
        description: 'Walk 10,000 steps every day for a week',
        category: 'health',
        type: 'individual',
        difficulty: 'medium',
        points: 500,
        experiencePoints: 500,
        duration: 7,
        target: { 
          type: 'count', 
          value: 10000, 
          unit: 'steps'
        },
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'active',
        isActive: true,
        isPublic: true,
        createdBy: createdUsers[0]._id
      },
      {
        title: 'Hydration Challenge',
        description: 'Drink 8 glasses of water daily for 30 days',
        category: 'health',
        type: 'community',
        difficulty: 'easy',
        points: 300,
        experiencePoints: 300,
        duration: 30,
        target: { 
          type: 'count', 
          value: 8, 
          unit: 'glasses'
        },
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'active',
        isActive: true,
        isPublic: true,
        featured: true,
        createdBy: createdUsers[0]._id
      },
      {
        title: 'Save $1000',
        description: 'Save $1000 in your emergency fund',
        category: 'wealth',
        type: 'individual',
        difficulty: 'hard',
        points: 1000,
        experiencePoints: 1000,
        duration: 90,
        target: { 
          type: 'amount', 
          value: 1000, 
          unit: 'dollars'
        },
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        status: 'active',
        isActive: true,
        isPublic: true,
        createdBy: createdUsers[0]._id
      }
    ];
    
    await Challenge.insertMany(challenges);
    console.log(`✅ Created ${challenges.length} challenges`);
    
    // Create sample team
    console.log('👥 Creating sample team...');
    const teamData = {
      name: 'Wellness Warriors',
      description: 'A team dedicated to achieving wellness goals together',
      category: 'wellness',
      type: 'public',
      creator: createdUsers[1]._id,
      leaders: [{
        userId: createdUsers[1]._id,
        role: 'captain',
        appointedAt: new Date()
      }],
      members: [
        {
          userId: createdUsers[1]._id,
          role: 'member',
          status: 'active',
          joinedAt: new Date(),
          contributions: {
            totalPoints: 2500,
            challengesCompleted: 2,
            daysActive: 15
          }
        },
        {
          userId: createdUsers[2]._id,
          role: 'member', 
          status: 'active',
          joinedAt: new Date(),
          contributions: {
            totalPoints: 3200,
            challengesCompleted: 3,
            daysActive: 22
          }
        }
      ],
      isPublic: true,
      maxMembers: 10,
      stats: {
        totalPoints: 5700,
        averagePoints: 2850,
        totalChallengesCompleted: 5,
        currentStreak: 12, 
        longestStreak: 18,
        activityScore: 85
      }
    };
    
    const team = await Team.create(teamData);
    console.log('✅ Created sample team');
    
    // Update users with team membership
    await User.findByIdAndUpdate(createdUsers[1]._id, {
      $push: { 
        teams: {
          teamId: team._id,
          role: 'captain',
          joinedAt: new Date()
        }
      }
    });
    await User.findByIdAndUpdate(createdUsers[2]._id, {
      $push: { 
        teams: {
          teamId: team._id,
          role: 'member',
          joinedAt: new Date()
        }
      }
    });
    
    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- ${achievements.length} achievements created`);
    console.log(`- ${createdUsers.length} users created`);
    console.log(`- ${challenges.length} challenges created`);
    console.log('- 1 team created');
    console.log('\n🔐 Login credentials:');
    console.log('Admin: admin@wellnesshub.app / Admin123!');
    console.log('User1: john@example.com / Password123!');
    console.log('User2: jane@example.com / Password123!');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    mongoose.connection.close();
  }
};

// Run the seeding script
if (require.main === module) {
  seedData();
}

module.exports = seedData;