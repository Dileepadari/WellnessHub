/** Shared domain types, mirroring the API responses in src/services/api.ts. */

export interface HealthGoals {
  height?: number;
  targetWeight?: number;
  dailyStepGoal?: number;
  dailyWaterGoal?: number;
  weeklyWorkoutMinuteGoal?: number;
  dailySleepGoal?: number;
  dailyMeditationGoal?: number;
  [key: string]: number | undefined;
}

export interface FinancialMetrics {
  monthlyIncome?: number;
  monthlySavingsGoal?: number;
  emergencyFundGoal?: number;
  currentSavings?: number;
  creditScore?: number;
  riskTolerance?: string;
  [key: string]: number | string | undefined;
}

export interface User {
  _id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  avatar?: string;
  role?: 'user' | 'admin';
  level: number;
  experience: number;
  totalPoints: number;
  availablePoints: number;
  currentStreak: number;
  longestStreak: number;
  levelProgress?: number;
  xpForNextLevel?: number;
  healthMetrics?: HealthGoals;
  financialMetrics?: FinancialMetrics;
  achievements?: unknown[];
  teams?: unknown[];
  activeChallenges?: unknown[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

/** Every route wraps its payload in this envelope. */
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface AuthPayload {
  token: string;
  user: User;
}
