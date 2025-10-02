import React, { useState } from 'react';
import {
  TrendingUp,
  Calendar,
  Target,
  Award,
  Users,
  Heart,
  DollarSign,
  Activity,
  Brain,
  Zap,
  Clock,
  ChevronRight,
  Plus,
  BarChart3,
  PieChart,
  MapPin,
  Bell,
  Settings,
  Star,
  Flame,
  Trophy,
  BookOpen,
  Shield,
  Smile,
} from 'lucide-react';
import { useUserStats, useChallenges } from '../hooks/useApi';

interface QuickStat {
  id: string;
  label: string;
  value: string | number;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ElementType;
  color: string;
}

interface ActivityItem {
  id: string;
  type: 'achievement' | 'challenge' | 'social' | 'milestone';
  title: string;
  description: string;
  timestamp: string;
  points?: number;
  icon: React.ElementType;
  color: string;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  category: 'health' | 'wealth' | 'social';
  progress: number;
  total: number;
  participants: number;
  reward: number;
  deadline: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

const mockStats: QuickStat[] = [
  {
    id: 'points',
    label: 'Total Points',
    value: '2,450',
    change: '+12%',
    trend: 'up',
    icon: Star,
    color: 'text-yellow-500',
  },
  {
    id: 'streak',
    label: 'Current Streak',
    value: '12 days',
    change: '+2 days',
    trend: 'up',
    icon: Flame,
    color: 'text-orange-500',
  },
  {
    id: 'challenges',
    label: 'Active Challenges',
    value: 4,
    change: 'No change',
    trend: 'neutral',
    icon: Target,
    color: 'text-blue-500',
  },
  {
    id: 'rank',
    label: 'Leaderboard Rank',
    value: '#47',
    change: '+5 positions',
    trend: 'up',
    icon: Trophy,
    color: 'text-purple-500',
  },
];

const mockActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'achievement',
    title: 'Hydration Hero',
    description: 'Completed 7-day water intake challenge',
    timestamp: '2024-01-15T10:30:00Z',
    points: 250,
    icon: Award,
    color: 'text-blue-500',
  },
  {
    id: '2',
    type: 'milestone',
    title: 'Savings Milestone',
    description: 'Reached $1,000 emergency fund goal',
    timestamp: '2024-01-14T15:45:00Z',
    points: 500,
    icon: DollarSign,
    color: 'text-green-500',
  },
  {
    id: '3',
    type: 'social',
    title: 'Community Support',
    description: 'Helped 5 members with fitness tips',
    timestamp: '2024-01-14T09:20:00Z',
    points: 100,
    icon: Heart,
    color: 'text-red-500',
  },
  {
    id: '4',
    type: 'challenge',
    title: 'Step Challenge Started',
    description: 'Joined the 10K steps daily challenge',
    timestamp: '2024-01-13T08:00:00Z',
    icon: Activity,
    color: 'text-indigo-500',
  },
];

const mockChallenges: Challenge[] = [
  {
    id: '1',
    title: '21-Day Meditation Journey',
    description: 'Build a daily meditation habit with guided sessions',
    category: 'health',
    progress: 7,
    total: 21,
    participants: 1243,
    reward: 750,
    deadline: '2024-02-05',
    difficulty: 'medium',
  },
  {
    id: '2',
    title: 'Emergency Fund Builder',
    description: 'Save $500 in 30 days with daily micro-savings',
    category: 'wealth',
    progress: 180,
    total: 500,
    participants: 856,
    reward: 1000,
    deadline: '2024-01-30',
    difficulty: 'hard',
  },
  {
    id: '3',
    title: 'Random Acts of Kindness',
    description: 'Perform one kind act daily for a week',
    category: 'social',
    progress: 3,
    total: 7,
    participants: 2103,
    reward: 300,
    deadline: '2024-01-22',
    difficulty: 'easy',
  },
];

export function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [quickActions, setQuickActions] = useState(false);

  const { data: userStats } = useUserStats();
  const { data: challenges } = useChallenges();

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  const getDaysUntilDeadline = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffInDays = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffInDays;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-500 bg-green-100 dark:bg-green-900/20';
      case 'medium': return 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/20';
      case 'hard': return 'text-red-500 bg-red-100 dark:bg-red-900/20';
      default: return 'text-gray-500 bg-gray-100 dark:bg-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'health': return Heart;
      case 'wealth': return DollarSign;
      case 'social': return Users;
      default: return Target;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome back! 👋
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Here's your wellness journey overview
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="input-field px-3 py-2 text-sm"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          
          <button className="btn-outline btn-sm">
            <BarChart3 size={16} />
            Analytics
          </button>
          
          <button 
            onClick={() => setQuickActions(!quickActions)}
            className="btn-primary btn-sm"
          >
            <Plus size={16} />
            Quick Action
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {mockStats.map((stat) => {
          const IconComponent = stat.icon;
          return (
            <div key={stat.id} className="card p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingUp 
                      size={14} 
                      className={stat.trend === 'up' ? 'text-green-500' : stat.trend === 'down' ? 'text-red-500' : 'text-gray-400'} 
                    />
                    <span className={`text-sm ${stat.trend === 'up' ? 'text-green-600' : stat.trend === 'down' ? 'text-red-600' : 'text-gray-500'}`}>
                      {stat.change}
                    </span>
                  </div>
                </div>
                <div className={`p-3 rounded-xl bg-opacity-20 ${stat.color.replace('text-', 'bg-').replace('-500', '-100')} dark:bg-opacity-20`}>
                  <IconComponent size={24} className={stat.color} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Challenges */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Target className="text-blue-500" size={24} />
                Active Challenges
              </h2>
              <button className="text-primary-500 hover:text-primary-600 font-medium text-sm flex items-center gap-1">
                View all
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="space-y-4">
              {mockChallenges.map((challenge) => {
                const CategoryIcon = getCategoryIcon(challenge.category);
                const progressPercentage = (challenge.progress / challenge.total) * 100;
                const daysLeft = getDaysUntilDeadline(challenge.deadline);

                return (
                  <div key={challenge.id} className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                          <CategoryIcon size={20} className="text-blue-500" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {challenge.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {challenge.description}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(challenge.difficulty)}`}>
                          {challenge.difficulty}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* Progress Bar */}
                      <div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-gray-600 dark:text-gray-400">
                            Progress: {challenge.progress}/{challenge.total}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {Math.round(progressPercentage)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                          <div 
                            className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2.5 rounded-full transition-all duration-300"
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Challenge Stats */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                            <Users size={14} />
                            {challenge.participants.toLocaleString()} participants
                          </span>
                          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                            <Star size={14} />
                            {challenge.reward} points
                          </span>
                        </div>
                        <span className={`flex items-center gap-1 ${daysLeft <= 3 ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'}`}>
                          <Clock size={14} />
                          {daysLeft} days left
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="text-green-500" size={24} />
              Recent Activity
            </h2>
            <button className="text-primary-500 hover:text-primary-600 font-medium text-sm">
              View all
            </button>
          </div>

          <div className="space-y-4">
            {mockActivities.map((activity) => {
              const IconComponent = activity.icon;
              return (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className={`p-2 rounded-full bg-opacity-20 ${activity.color.replace('text-', 'bg-').replace('-500', '-100')} dark:bg-opacity-20`}>
                    <IconComponent size={16} className={activity.color} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                      {activity.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {activity.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-500">
                        {getTimeAgo(activity.timestamp)}
                      </span>
                      {activity.points && (
                        <>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                            +{activity.points} pts
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button className="w-full mt-4 py-2 text-sm text-primary-500 hover:text-primary-600 font-medium border border-primary-200 dark:border-primary-800 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
            Load more activities
          </button>
        </div>
      </div>

      {/* Progress Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Progress */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="text-purple-500" size={24} />
              Weekly Progress
            </h2>
            <button className="btn-outline btn-sm">
              <Settings size={14} />
              Configure
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Health Goals</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">85%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full" style={{ width: '85%' }} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Wealth Goals</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">72%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div className="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full" style={{ width: '72%' }} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Social Impact</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">91%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div className="bg-gradient-to-r from-purple-400 to-purple-600 h-3 rounded-full" style={{ width: '91%' }} />
            </div>
          </div>

          <div className="mt-6 p-4 bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-500 rounded-lg text-white">
                <Zap size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-primary-900 dark:text-primary-100">
                  You're on fire! 🔥
                </h3>
                <p className="text-sm text-primary-700 dark:text-primary-300">
                  Complete 2 more challenges to unlock your weekly bonus
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Achievements Showcase */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Award className="text-yellow-500" size={24} />
              Recent Achievements
            </h2>
            <button className="text-primary-500 hover:text-primary-600 font-medium text-sm flex items-center gap-1">
              View all
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { name: 'Hydration Hero', icon: '💧', rarity: 'Common' },
              { name: 'Savings Star', icon: '⭐', rarity: 'Rare' },
              { name: 'Community Leader', icon: '👑', rarity: 'Epic' },
              { name: 'Streak Master', icon: '🔥', rarity: 'Rare' },
              { name: 'Helper Badge', icon: '🤝', rarity: 'Common' },
              { name: 'Fitness Guru', icon: '💪', rarity: 'Epic' },
            ].map((achievement, index) => (
              <div key={index} className="text-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                <div className="text-3xl mb-2">{achievement.icon}</div>
                <h3 className="font-medium text-xs text-gray-900 dark:text-white mb-1">
                  {achievement.name}
                </h3>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  achievement.rarity === 'Epic' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' :
                  achievement.rarity === 'Rare' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' :
                  'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  {achievement.rarity}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-3">
              <Trophy className="text-yellow-500" size={24} />
              <div>
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
                  Next Achievement: Consistency Champion
                </h3>
                <p className="text-sm text-yellow-600 dark:text-yellow-300">
                  Complete daily activities for 30 days (18/30)
                </p>
                <div className="w-full bg-yellow-200 dark:bg-yellow-800 rounded-full h-2 mt-2">
                  <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '60%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Modal */}
      {quickActions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="card max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Quick Actions
              </h3>
              <button
                onClick={() => setQuickActions(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Target, label: 'Join Challenge', color: 'text-blue-500' },
                { icon: BookOpen, label: 'Log Activity', color: 'text-green-500' },
                { icon: Users, label: 'Find Friends', color: 'text-purple-500' },
                { icon: DollarSign, label: 'Set Goal', color: 'text-yellow-500' },
                { icon: Heart, label: 'Check-in', color: 'text-red-500' },
                { icon: Brain, label: 'Learn', color: 'text-indigo-500' },
              ].map((action, index) => {
                const IconComponent = action.icon;
                return (
                  <button
                    key={index}
                    className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow text-center"
                    onClick={() => setQuickActions(false)}
                  >
                    <IconComponent size={24} className={`${action.color} mx-auto mb-2`} />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {action.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}