import React, { useState } from 'react';
import {
  Trophy,
  Target,
  Users,
  Flame,
  Star,
  Zap,
  Timer,
  Gift,
  TrendingUp,
  Calendar,
  Award,
  ArrowRight,
  Play,
  CheckCircle,
  Lock,
  Crown,
  Shield,
} from 'lucide-react';
import { useUserChallenges, useJoinChallenge, useCompleteChallenge } from '../hooks/useApi';

interface Challenge {
  _id: string;
  title: string;
  description: string;
  category: 'health' | 'wealth' | 'insurance' | 'social';
  type: string;
  target: number;
  duration: number;
  points: number;
  difficulty: 'easy' | 'medium' | 'hard';
  badge: string;
  isActive: boolean;
  progress?: number;
  status?: 'not_started' | 'active' | 'completed';
  participants?: number;
  trending?: boolean;
  timeLeft?: string;
}

const difficultyColors = {
  easy: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  hard: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const categoryIcons = {
  health: Trophy,
  wealth: Target,
  insurance: Shield,
  social: Users,
};

const categoryColors = {
  health: 'from-red-500 to-pink-500',
  wealth: 'from-green-500 to-emerald-500',
  insurance: 'from-blue-500 to-cyan-500',
  social: 'from-purple-500 to-violet-500',
};

export function GamificationEngine() {
  const [activeTab, setActiveTab] = useState<'active' | 'available' | 'completed'>('active');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const { data: userChallenges, isLoading } = useUserChallenges();
  const joinChallengeMutation = useJoinChallenge();
  const completeChallengeMutation = useCompleteChallenge();

  const mockChallenges: Challenge[] = [
    {
      _id: '1',
      title: '10K Steps Daily',
      description: 'Walk 10,000 steps every day for a week to boost your health score',
      category: 'health',
      type: 'steps',
      target: 70000,
      duration: 7,
      points: 500,
      difficulty: 'medium',
      badge: 'steps_champion',
      isActive: true,
      progress: 65,
      status: 'active',
      participants: 1247,
      trending: true,
      timeLeft: '3 days left',
    },
    {
      _id: '2',
      title: 'Hydration Hero',
      description: 'Drink 8 glasses of water daily for 5 consecutive days',
      category: 'health',
      type: 'hydration',
      target: 40,
      duration: 5,
      points: 300,
      difficulty: 'easy',
      badge: 'hydration_hero',
      isActive: true,
      progress: 0,
      status: 'not_started',
      participants: 892,
      timeLeft: '5 days left',
    },
    {
      _id: '3',
      title: 'Savings Superstar',
      description: 'Save $100 this month to improve your wealth score',
      category: 'wealth',
      type: 'savings',
      target: 100,
      duration: 30,
      points: 1000,
      difficulty: 'hard',
      badge: 'savings_star',
      isActive: true,
      progress: 35,
      status: 'active',
      participants: 543,
      timeLeft: '12 days left',
    },
    {
      _id: '4',
      title: 'Budget Tracker Pro',
      description: 'Track all your expenses for 14 days straight',
      category: 'wealth',
      type: 'budgeting',
      target: 14,
      duration: 14,
      points: 400,
      difficulty: 'medium',
      badge: 'budget_pro',
      isActive: true,
      progress: 85,
      status: 'active',
      participants: 721,
      timeLeft: '2 days left',
    },
    {
      _id: '5',
      title: 'Team Challenge Master',
      description: 'Complete 3 team challenges with your squad',
      category: 'social',
      type: 'team_challenges',
      target: 3,
      duration: 14,
      points: 750,
      difficulty: 'medium',
      badge: 'team_master',
      isActive: true,
      progress: 0,
      status: 'not_started',
      participants: 234,
      timeLeft: '14 days left',
    },
  ];

  const filteredChallenges = mockChallenges.filter(challenge => {
    const statusFilter = 
      activeTab === 'active' ? challenge.status === 'active' :
      activeTab === 'available' ? challenge.status === 'not_started' :
      challenge.status === 'completed';
    
    const categoryFilter = selectedCategory === 'all' || challenge.category === selectedCategory;
    
    return statusFilter && categoryFilter;
  });

  const handleJoinChallenge = (challengeId: string) => {
    joinChallengeMutation.mutate(challengeId);
  };

  const handleCompleteChallenge = (challengeId: string) => {
    completeChallengeMutation.mutate({
      challengeId,
      completionData: { completedAt: new Date().toISOString() }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-600 via-purple-600 to-secondary-600 p-8 text-white">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Zap size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Gamification Center</h1>
              <p className="text-white/80">Level up your wellness journey</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy size={20} className="text-yellow-300" />
                <span className="text-sm font-medium">Active Challenges</span>
              </div>
              <p className="text-2xl font-bold">
                {filteredChallenges.filter(c => c.status === 'active').length}
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Star size={20} className="text-yellow-300" />
                <span className="text-sm font-medium">Total Points</span>
              </div>
              <p className="text-2xl font-bold">2,450</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Flame size={20} className="text-orange-300" />
                <span className="text-sm font-medium">Current Streak</span>
              </div>
              <p className="text-2xl font-bold">7 days</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Crown size={20} className="text-yellow-300" />
                <span className="text-sm font-medium">Rank</span>
              </div>
              <p className="text-2xl font-bold">#42</p>
            </div>
          </div>
        </div>
        
        {/* Background decoration */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/10 rounded-full"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/5 rounded-full"></div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {(['active', 'available', 'completed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === tab
                  ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="form-input text-sm"
          >
            <option value="all">All Categories</option>
            <option value="health">Health</option>
            <option value="wealth">Wealth</option>
            <option value="insurance">Insurance</option>
            <option value="social">Social</option>
          </select>
        </div>
      </div>

      {/* Challenges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredChallenges.map((challenge) => {
          const Icon = categoryIcons[challenge.category];
          const isCompleted = challenge.status === 'completed';
          const isActive = challenge.status === 'active';
          const canComplete = isActive && (challenge.progress || 0) >= 100;
          
          return (
            <div
              key={challenge._id}
              className={`card overflow-hidden transition-all duration-300 hover:scale-105 ${
                isCompleted ? 'ring-2 ring-success-200 dark:ring-success-800' : ''
              }`}
            >
              {/* Challenge Header */}
              <div className={`h-32 bg-gradient-to-r ${categoryColors[challenge.category]} relative`}>
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="relative z-10 p-4 text-white h-full flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <Icon size={20} />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {challenge.trending && (
                        <div className="flex items-center gap-1 bg-orange-500 text-white px-2 py-1 rounded-full text-xs">
                          <TrendingUp size={12} />
                          <span>Trending</span>
                        </div>
                      )}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${difficultyColors[challenge.difficulty]}`}>
                        {challenge.difficulty}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-lg">{challenge.title}</h3>
                    <div className="flex items-center gap-2 text-white/80 text-sm">
                      <Timer size={14} />
                      <span>{challenge.timeLeft}</span>
                      <Users size={14} />
                      <span>{challenge.participants?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Challenge Content */}
              <div className="p-4">
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  {challenge.description}
                </p>

                {/* Progress Bar (for active challenges) */}
                {isActive && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Progress</span>
                      <span className="text-sm font-medium">{challenge.progress}%</span>
                    </div>
                    <div className="progress-bar h-2">
                      <div 
                        className="progress-fill h-full"
                        style={{ width: `${challenge.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Reward Info */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Gift size={16} className="text-primary-500" />
                    <span className="text-sm font-medium">{challenge.points} points</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award size={16} className="text-yellow-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {challenge.badge}
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                <div className="flex gap-2">
                  {challenge.status === 'not_started' && (
                    <button
                      onClick={() => handleJoinChallenge(challenge._id)}
                      disabled={joinChallengeMutation.isPending}
                      className="btn-primary flex-1 flex items-center justify-center gap-2"
                    >
                      <Play size={16} />
                      {joinChallengeMutation.isPending ? 'Joining...' : 'Join Challenge'}
                    </button>
                  )}
                  
                  {isActive && !canComplete && (
                    <button className="btn-outline flex-1 flex items-center justify-center gap-2">
                      <Calendar size={16} />
                      In Progress
                    </button>
                  )}
                  
                  {canComplete && (
                    <button
                      onClick={() => handleCompleteChallenge(challenge._id)}
                      disabled={completeChallengeMutation.isPending}
                      className="btn-success flex-1 flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={16} />
                      {completeChallengeMutation.isPending ? 'Completing...' : 'Complete'}
                    </button>
                  )}
                  
                  {isCompleted && (
                    <button className="btn-success flex-1 flex items-center justify-center gap-2" disabled>
                      <CheckCircle size={16} />
                      Completed
                    </button>
                  )}
                  
                  <button className="btn-ghost px-3">
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredChallenges.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy size={24} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No {activeTab} challenges found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {activeTab === 'active' 
              ? "You don't have any active challenges. Join one to get started!"
              : activeTab === 'available'
              ? "All available challenges have been joined or completed."
              : "You haven't completed any challenges yet."
            }
          </p>
          {activeTab !== 'available' && (
            <button 
              onClick={() => setActiveTab('available')}
              className="btn-primary"
            >
              Browse Available Challenges
            </button>
          )}
        </div>
      )}
    </div>
  );
}