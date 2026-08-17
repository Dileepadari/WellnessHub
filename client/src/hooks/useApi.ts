import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiService } from '@/services/api';

const MINUTE = 60 * 1000;
type Json = Record<string, unknown>;

export const keys = {
  user: {
    stats: ['user', 'stats'] as const,
    leaderboard: ['user', 'leaderboard'] as const
  },
  health: {
    defs: ['health', 'defs'] as const,
    summary: (days: number) => ['health', 'summary', days] as const,
    activities: ['health', 'activities'] as const
  },
  wealth: {
    categories: ['wealth', 'categories'] as const,
    summary: (months: number) => ['wealth', 'summary', months] as const,
    transactions: (params: string) => ['wealth', 'transactions', params] as const,
    goals: ['wealth', 'goals'] as const
  },
  insurance: {
    types: ['insurance', 'types'] as const,
    policies: ['insurance', 'policies'] as const,
    alerts: ['insurance', 'alerts'] as const,
    coverage: ['insurance', 'coverage'] as const
  },
  challenges: (category: string) => ['challenges', category] as const,
  community: {
    feed: ['community', 'feed'] as const,
    leaderboard: ['community', 'leaderboard'] as const
  },
  gamification: {
    achievements: ['gamification', 'achievements'] as const,
    progress: ['gamification', 'progress'] as const
  },
  analytics: {
    dashboard: (period: string) => ['analytics', 'dashboard', period] as const,
    trends: (period: string) => ['analytics', 'trends', period] as const
  }
};

/** Everything a health write invalidates: the log, the summary, and derived figures. */
const HEALTH_SCOPE: QueryKey[] = [
  ['health'],
  ['analytics'],
  ['gamification', 'progress'],
  ['user', 'stats']
];
const WEALTH_SCOPE: QueryKey[] = [['wealth'], ['analytics']];
const INSURANCE_SCOPE: QueryKey[] = [['insurance'], ['analytics']];

const messageOf = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

/**
 * The toast-plus-invalidate pattern every write shares. Keys are matched by
 * prefix, so passing `['health']` refreshes every health query at once.
 */
function useWrite<TArgs, TResult>(options: {
  mutationFn: (args: TArgs) => Promise<TResult>;
  success: string;
  failure: string;
  invalidates?: QueryKey[];
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: options.mutationFn,
    onSuccess: () => {
      options.invalidates?.forEach((queryKey) => {
        void queryClient.invalidateQueries({ queryKey });
      });
      toast.success(options.success);
    },
    onError: (error: unknown) => toast.error(messageOf(error, options.failure))
  });
}

// --- Health ---
export const useHealthMetricDefs = () =>
  useQuery({
    queryKey: keys.health.defs,
    queryFn: () => apiService.getHealthMetricDefs(),
    staleTime: 60 * MINUTE
  });

export const useHealthSummary = (days = 7) =>
  useQuery({
    queryKey: keys.health.summary(days),
    queryFn: () => apiService.getHealthSummary(days),
    staleTime: MINUTE
  });

export const useActivities = (limit = 25) =>
  useQuery({
    queryKey: keys.health.activities,
    queryFn: () => apiService.getActivities(limit),
    staleTime: MINUTE
  });

export const useLogActivity = () =>
  useWrite({
    mutationFn: (payload: Json) => apiService.logActivity(payload),
    success: 'Logged',
    failure: 'Could not log activity',
    invalidates: HEALTH_SCOPE
  });

export const useDeleteActivity = () =>
  useWrite({
    mutationFn: (id: string) => apiService.deleteActivity(id),
    success: 'Entry deleted',
    failure: 'Could not delete entry',
    invalidates: HEALTH_SCOPE
  });

export const useUpdateHealthGoals = () =>
  useWrite({
    mutationFn: (payload: Json) => apiService.updateHealthGoals(payload),
    success: 'Goals updated',
    failure: 'Could not update goals',
    invalidates: HEALTH_SCOPE
  });

// --- Wealth ---
export const useWealthCategories = () =>
  useQuery({
    queryKey: keys.wealth.categories,
    queryFn: () => apiService.getWealthCategories(),
    staleTime: 60 * MINUTE
  });

export const useWealthSummary = (months = 6) =>
  useQuery({
    queryKey: keys.wealth.summary(months),
    queryFn: () => apiService.getWealthSummary(months),
    staleTime: MINUTE
  });

export const useTransactions = (params: { limit?: number; kind?: string; month?: string } = {}) =>
  useQuery({
    queryKey: keys.wealth.transactions(JSON.stringify(params)),
    queryFn: () => apiService.getTransactions(params),
    staleTime: MINUTE
  });

export const useCreateTransaction = () =>
  useWrite({
    mutationFn: (payload: Json) => apiService.createTransaction(payload),
    success: 'Transaction recorded',
    failure: 'Could not record transaction',
    invalidates: WEALTH_SCOPE
  });

export const useDeleteTransaction = () =>
  useWrite({
    mutationFn: (id: string) => apiService.deleteTransaction(id),
    success: 'Transaction deleted',
    failure: 'Could not delete transaction',
    invalidates: WEALTH_SCOPE
  });

export const useWealthGoals = () =>
  useQuery({ queryKey: keys.wealth.goals, queryFn: () => apiService.getWealthGoals() });

export const useCreateWealthGoal = () =>
  useWrite({
    mutationFn: (payload: Json) => apiService.createWealthGoal(payload),
    success: 'Goal created',
    failure: 'Could not create goal',
    invalidates: WEALTH_SCOPE
  });

export const useAddGoalContribution = () =>
  useWrite({
    mutationFn: ({ id, ...payload }: Json & { id: string }) =>
      apiService.addGoalContribution(id, payload),
    success: 'Contribution added',
    failure: 'Could not add contribution',
    invalidates: WEALTH_SCOPE
  });

export const useDeleteWealthGoal = () =>
  useWrite({
    mutationFn: (id: string) => apiService.deleteWealthGoal(id),
    success: 'Goal deleted',
    failure: 'Could not delete goal',
    invalidates: WEALTH_SCOPE
  });

export const useUpdateWealthProfile = () =>
  useWrite({
    mutationFn: (payload: Json) => apiService.updateWealthProfile(payload),
    success: 'Profile updated',
    failure: 'Could not update profile',
    invalidates: WEALTH_SCOPE
  });

// --- Insurance ---
export const usePolicyTypes = () =>
  useQuery({
    queryKey: keys.insurance.types,
    queryFn: () => apiService.getPolicyTypes(),
    staleTime: 60 * MINUTE
  });

export const usePolicies = () =>
  useQuery({ queryKey: keys.insurance.policies, queryFn: () => apiService.getPolicies() });

export const useInsuranceAlerts = () =>
  useQuery({ queryKey: keys.insurance.alerts, queryFn: () => apiService.getInsuranceAlerts() });

export const useCoverage = () =>
  useQuery({ queryKey: keys.insurance.coverage, queryFn: () => apiService.getCoverage() });

export const useCreatePolicy = () =>
  useWrite({
    mutationFn: (payload: Json) => apiService.createPolicy(payload),
    success: 'Policy added',
    failure: 'Could not add policy',
    invalidates: INSURANCE_SCOPE
  });

export const useDeletePolicy = () =>
  useWrite({
    mutationFn: (id: string) => apiService.deletePolicy(id),
    success: 'Policy deleted',
    failure: 'Could not delete policy',
    invalidates: INSURANCE_SCOPE
  });

// --- Challenges ---
export const useChallenges = (category = '') =>
  useQuery({
    queryKey: keys.challenges(category),
    queryFn: () => apiService.getChallenges(category ? { category } : {}),
    staleTime: 5 * MINUTE
  });

export const useMyChallenges = () =>
  useQuery({
    queryKey: ['challenges', 'mine'],
    queryFn: () => apiService.getMyChallenges(),
    staleTime: MINUTE
  });

export const useJoinChallenge = () =>
  useWrite({
    mutationFn: (id: string) => apiService.joinChallenge(id),
    success: 'Joined',
    failure: 'Could not join challenge',
    invalidates: [['challenges'], ['user', 'stats'], ['analytics']]
  });

// --- Community ---
export const useCommunityFeed = (limit = 25) =>
  useQuery({
    queryKey: keys.community.feed,
    queryFn: () => apiService.getCommunityFeed(limit),
    staleTime: MINUTE
  });

export const useCommunityLeaderboard = () =>
  useQuery({
    queryKey: keys.community.leaderboard,
    queryFn: () => apiService.getCommunityLeaderboard(),
    staleTime: 5 * MINUTE
  });

export const useTeams = () =>
  useQuery({
    queryKey: ['community', 'teams'],
    queryFn: () => apiService.getTeams(),
    staleTime: 5 * MINUTE
  });

export const useJoinTeam = () =>
  useWrite({
    mutationFn: (id: string) => apiService.joinTeam(id),
    success: 'Joined team',
    failure: 'Could not join team',
    invalidates: [['community']]
  });

export const useShareToCommunity = () =>
  useWrite({
    mutationFn: (payload: Json) => apiService.shareToCommunity(payload),
    success: 'Shared',
    failure: 'Could not share',
    invalidates: [['community']]
  });

// --- Gamification ---
export const useAchievements = () =>
  useQuery({
    queryKey: keys.gamification.achievements,
    queryFn: () => apiService.getAchievements(),
    staleTime: 30 * MINUTE
  });

export const useProgress = () =>
  useQuery({
    queryKey: keys.gamification.progress,
    queryFn: () => apiService.getProgress(),
    staleTime: MINUTE
  });

export const useClaimDailyBonus = () =>
  useWrite({
    mutationFn: () => apiService.claimDailyBonus(),
    success: 'Daily bonus claimed',
    failure: 'Daily bonus unavailable',
    invalidates: [['gamification'], ['user', 'stats'], ['analytics']]
  });

// --- Analytics ---
export const useDashboard = (period = '30d') =>
  useQuery({
    queryKey: keys.analytics.dashboard(period),
    queryFn: () => apiService.getDashboard(period),
    staleTime: MINUTE
  });

export const useTrends = (period = '30d') =>
  useQuery({
    queryKey: keys.analytics.trends(period),
    queryFn: () => apiService.getTrends(period),
    staleTime: MINUTE
  });

export const useUserStats = () =>
  useQuery({
    queryKey: keys.user.stats,
    queryFn: () => apiService.getUserStats(),
    staleTime: MINUTE
  });

export const useUserLeaderboard = () =>
  useQuery({
    queryKey: keys.user.leaderboard,
    queryFn: () => apiService.getUserLeaderboard(),
    staleTime: 5 * MINUTE
  });
