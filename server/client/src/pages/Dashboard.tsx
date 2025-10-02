import React from 'react';
import {
  TrendingUp,
  Heart,
  DollarSign,
  Shield,
  Target,
  Award,
  Users,
  Flame,

  Star,
  ArrowRight,
  Activity,
  Zap,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  useUserStats,
  useHealthMetrics,
  useWealthData,
  useInsurancePolicies,
  useUserChallenges,
  useUserAchievements,
  useCompleteChallenge,
} from '../hooks/useApi';

export function Dashboard() {
  const { user } = useAuth();
  const { isLoading: statsLoading } = useUserStats();
  const { data: healthMetrics, isLoading: healthLoading } = useHealthMetrics();
  const { data: wealthData, isLoading: wealthLoading } = useWealthData();
  const { data: insurancePolicies, isLoading: insuranceLoading } = useInsurancePolicies();
  const { data: userChallenges } = useUserChallenges();
  const { data: userAchievements } = useUserAchievements();
  const completeChallengeMutation = useCompleteChallenge();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Please sign in to continue
          </h2>
          <button className="btn-primary">Sign In</button>
        </div>
      </div>
    );
  }

  const isLoading = statsLoading || healthLoading || wealthLoading || insuranceLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-500" />
          <p className="text-gray-600 dark:text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }
  // Calculate dynamic stats from API data
  const healthScore = healthMetrics?.overallScore || 0;
  const wealthScore = wealthData?.score || 0;
  const insuranceCoverage = insurancePolicies ? 
    Math.round((insurancePolicies.length / 4) * 100) : 0; // Assuming 4 types of insurance
  const activeChallenges = userChallenges?.filter((c: any) => c.status === 'active').length || 0;

  const quickStats = [
    {
      label: 'Health Score',
      value: healthScore.toFixed(1),
      change: healthMetrics?.scoreChange || '+0.0',
      changeType: healthMetrics?.scoreChange?.startsWith('+') ? 'positive' as const : 'negative' as const,
      icon: Heart,
      color: 'text-red-500',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
    },
    {
      label: 'Wealth Score',
      value: wealthScore.toFixed(1),
      change: wealthData?.scoreChange || '+0.0',
      changeType: wealthData?.scoreChange?.startsWith('+') ? 'positive' as const : 'negative' as const,
      icon: DollarSign,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      label: 'Insurance Coverage',
      value: `${Math.min(insuranceCoverage, 100)}%`,
      change: '+5%',
      changeType: 'positive' as const,
      icon: Shield,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Active Challenges',
      value: activeChallenges.toString(),
      change: '+3',
      changeType: 'positive' as const,
      icon: Target,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
  ];

  const recentAchievements = userAchievements?.slice(0, 3).map((achievement: any) => ({
    id: achievement._id,
    title: achievement.title,
    description: achievement.description,
    icon: getAchievementIcon(achievement.type),
    date: new Date(achievement.unlockedAt).toLocaleDateString(),
    points: achievement.points,
  })) || [];

  const todayChallenges = userChallenges?.filter((challenge: any) => {
    const today = new Date().toDateString();
    return new Date(challenge.createdAt).toDateString() === today;
  }).map((challenge: any) => ({
    id: challenge._id,
    title: challenge.title,
    category: challenge.category,
    points: challenge.points,
    completed: challenge.status === 'completed',
    icon: getChallengeIcon(challenge.category),
  })) || [];

  const completedChallenges = userChallenges?.filter((c: any) => c.status === 'completed').length || 0;
  const totalChallenges = userChallenges?.length || 1;
  const completionRate = (completedChallenges / totalChallenges) * 100;

  function getAchievementIcon(type: string) {
    switch (type) {
      case 'streak': return Flame;
      case 'wealth': return DollarSign;
      case 'health': return Heart;
      case 'community': return Users;
      default: return Award;
    }
  }

  function getChallengeIcon(category: string) {
    switch (category?.toLowerCase()) {
      case 'health': return Heart;
      case 'wealth': return DollarSign;
      case 'insurance': return Shield;
      case 'community': return Users;
      default: return Target;
    }
  }

  const handleCompleteChallenge = (challengeId: string) => {
    completeChallengeMutation.mutate({
      challengeId,
      completionData: { completedAt: new Date().toISOString() }
    });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-500 via-purple-500 to-secondary-500 p-8 text-white">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">
            Good morning, {user.firstName}! 🌟
          </h1>
          <p className="text-primary-100 text-lg mb-6">
            You're doing amazing! Keep up the momentum and reach new heights today.
          </p>
          
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Flame className="text-orange-300" size={20} />
                <span className="font-semibold">{user.currentStreak} day streak</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Zap className="text-yellow-300" size={20} />
              <span className="font-semibold">{user.totalPoints.toLocaleString()} points</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Star className="text-yellow-300" size={20} />
              <span className="font-semibold">Level {user.level}</span>
            </div>
          </div>
        </div>
        
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24" />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="card p-6 hover:scale-105 transition-transform duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon size={24} className={stat.color} />
                </div>
                <div className={`flex items-center gap-1 text-sm ${
                  stat.changeType === 'positive' ? 'text-green-500' : 'text-red-500'
                }`}>
                  <TrendingUp size={16} />
                  {stat.change}
                </div>
              </div>
              
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {stat.value}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {stat.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Today's Challenges */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Today's Challenges
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Activity size={16} />
                <span>
                  {todayChallenges.filter((c: any) => c.completed).length} of {todayChallenges.length} completed
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {todayChallenges.map((challenge: any) => {
                const Icon = challenge.icon;
                return (
                  <div
                    key={challenge.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all duration-200 ${
                      challenge.completed
                        ? 'border-success-200 bg-success-50 dark:border-success-800 dark:bg-success-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-700'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${
                      challenge.completed
                        ? 'bg-success-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
                      <Icon size={20} />
                    </div>
                    
                    <div className="flex-1">
                      <h3 className={`font-medium ${
                        challenge.completed
                          ? 'text-success-700 dark:text-success-300 line-through'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {challenge.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {challenge.category} • {challenge.points} points
                      </p>
                    </div>
                    
                    {!challenge.completed && (
                      <button 
                        onClick={() => handleCompleteChallenge(challenge.id)}
                        disabled={completeChallengeMutation.isPending}
                        className="btn-primary btn-sm disabled:opacity-50"
                      >
                        {completeChallengeMutation.isPending ? 'Completing...' : 'Complete'}
                      </button>
                    )}
                    
                    {challenge.completed && (
                      <div className="text-success-500">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Overall Progress
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {Math.round(completionRate)}%
                </span>
              </div>
              <div className="progress-bar h-2">
                <div 
                  className="progress-fill h-full"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Achievements */}
        <div>
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Recent Achievements
              </h2>
              <button className="text-primary-500 hover:text-primary-600 text-sm font-medium">
                View All
              </button>
            </div>

            <div className="space-y-4">
              {recentAchievements.map((achievement: any) => {
                const Icon = achievement.icon;
                return (
                  <div
                    key={achievement.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
                  >
                    <div className="p-2 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg text-white">
                      <Icon size={16} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                        {achievement.title}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {achievement.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500">
                          {achievement.date}
                        </span>
                        <span className="text-xs text-primary-500 font-medium">
                          +{achievement.points} pts
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button className="w-full mt-4 py-2 text-center text-primary-500 hover:text-primary-600 font-medium text-sm transition-colors duration-200">
              View Achievement Gallery
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          Quick Actions
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Log Meal', icon: Heart, color: 'bg-red-500' },
            { label: 'Add Expense', icon: DollarSign, color: 'bg-green-500' },
            { label: 'Check Insurance', icon: Shield, color: 'bg-blue-500' },
            { label: 'Join Challenge', icon: Target, color: 'bg-purple-500' },
          ].map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-200 text-left"
              >
                <div className={`p-2.5 ${action.color} rounded-lg text-white`}>
                  <Icon size={20} />
                </div>
                <span className="font-medium text-gray-900 dark:text-white">
                  {action.label}
                </span>
                <ArrowRight size={16} className="ml-auto text-gray-400" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}