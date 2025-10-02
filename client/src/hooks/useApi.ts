import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import toast from 'react-hot-toast';

// Query Keys
export const queryKeys = {
  user: ['user'],
  userStats: ['user', 'stats'],
  health: {
    metrics: ['health', 'metrics'],
    goals: ['health', 'goals'],
  },
  wealth: {
    data: ['wealth', 'data'],
    budgets: ['wealth', 'budgets'],
  },
  insurance: {
    policies: ['insurance', 'policies'],
    recommendations: ['insurance', 'recommendations'],
  },
  challenges: {
    all: ['challenges'],
    user: ['challenges', 'user'],
  },
  community: {
    posts: ['community', 'posts'],
  },
  analytics: (period: string) => ['analytics', period],
  achievements: {
    all: ['achievements'],
    user: ['achievements', 'user'],
  },
};

// User Hooks
export function useUserStats() {
  return useQuery({
    queryKey: queryKeys.userStats,
    queryFn: () => apiService.getUserStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Health Hooks
export function useHealthMetrics() {
  return useQuery({
    queryKey: queryKeys.health.metrics,
    queryFn: () => apiService.getHealthMetrics(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useHealthGoals() {
  return useQuery({
    queryKey: queryKeys.health.goals,
    queryFn: () => apiService.getHealthGoals(),
  });
}

export function useLogHealthData() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (healthData: any) => apiService.logHealthData(healthData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.health.metrics });
      queryClient.invalidateQueries({ queryKey: queryKeys.userStats });
      toast.success('Health data logged successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to log health data');
    },
  });
}

export function useCreateHealthGoal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (goalData: any) => apiService.createHealthGoal(goalData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.health.goals });
      toast.success('Health goal created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create health goal');
    },
  });
}

// Wealth Hooks
export function useWealthData() {
  return useQuery({
    queryKey: queryKeys.wealth.data,
    queryFn: () => apiService.getWealthData(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useBudgets() {
  return useQuery({
    queryKey: queryKeys.wealth.budgets,
    queryFn: () => apiService.getBudgets(),
  });
}

export function useAddExpense() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (expenseData: any) => apiService.addExpense(expenseData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wealth.data });
      queryClient.invalidateQueries({ queryKey: queryKeys.userStats });
      toast.success('Expense added successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add expense');
    },
  });
}

export function useAddIncome() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (incomeData: any) => apiService.addIncome(incomeData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wealth.data });
      queryClient.invalidateQueries({ queryKey: queryKeys.userStats });
      toast.success('Income added successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add income');
    },
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (budgetData: any) => apiService.createBudget(budgetData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wealth.budgets });
      toast.success('Budget created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create budget');
    },
  });
}

// Insurance Hooks
export function useInsurancePolicies() {
  return useQuery({
    queryKey: queryKeys.insurance.policies,
    queryFn: () => apiService.getInsurancePolicies(),
  });
}

export function useInsuranceRecommendations() {
  return useQuery({
    queryKey: queryKeys.insurance.recommendations,
    queryFn: () => apiService.getInsuranceRecommendations(),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useAddInsurancePolicy() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (policyData: any) => apiService.addInsurancePolicy(policyData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.insurance.policies });
      queryClient.invalidateQueries({ queryKey: queryKeys.userStats });
      toast.success('Insurance policy added successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add insurance policy');
    },
  });
}

// Challenge Hooks
export function useChallenges() {
  return useQuery({
    queryKey: queryKeys.challenges.all,
    queryFn: () => apiService.getChallenges(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useUserChallenges() {
  return useQuery({
    queryKey: queryKeys.challenges.user,
    queryFn: () => apiService.getUserChallenges(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useJoinChallenge() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (challengeId: string) => apiService.joinChallenge(challengeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.challenges.user });
      queryClient.invalidateQueries({ queryKey: queryKeys.userStats });
      toast.success('Challenge joined successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to join challenge');
    },
  });
}

export function useCompleteChallenge() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ challengeId, completionData }: { challengeId: string; completionData: any }) =>
      apiService.completeChallenge(challengeId, completionData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.challenges.user });
      queryClient.invalidateQueries({ queryKey: queryKeys.userStats });
      queryClient.invalidateQueries({ queryKey: queryKeys.achievements.user });
      toast.success('Challenge completed! 🎉');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to complete challenge');
    },
  });
}

// Community Hooks
export function useCommunityPosts() {
  return useQuery({
    queryKey: queryKeys.community.posts,
    queryFn: () => apiService.getCommunityPosts(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (postData: any) => apiService.createPost(postData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.community.posts });
      toast.success('Post created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create post');
    },
  });
}

export function useLikePost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (postId: string) => apiService.likePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.community.posts });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to like post');
    },
  });
}

export function useCommentOnPost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ postId, comment }: { postId: string; comment: string }) =>
      apiService.commentOnPost(postId, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.community.posts });
      toast.success('Comment added successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add comment');
    },
  });
}

// Analytics Hooks
export function useAnalytics(period: string = '30d') {
  return useQuery({
    queryKey: queryKeys.analytics(period),
    queryFn: () => apiService.getAnalytics(period),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => apiService.getLeaderboard(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Achievement Hooks
export function useAchievements() {
  return useQuery({
    queryKey: queryKeys.achievements.all,
    queryFn: () => apiService.getAchievements(),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useUserAchievements() {
  return useQuery({
    queryKey: queryKeys.achievements.user,
    queryFn: () => apiService.getUserAchievements(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}