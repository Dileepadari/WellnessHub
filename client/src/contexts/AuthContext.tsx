import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiService } from '../services/api';
import toast from 'react-hot-toast';

interface User {
  _id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatar?: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  level: number;
  experience: number;
  totalPoints: number;
  availablePoints: number;
  currentStreak: number;
  longestStreak: number;
  healthMetrics: {
    height?: number;
    weight?: number;
    targetWeight?: number;
    dailyStepGoal: number;
    dailyWaterGoal: number;
    weeklyWorkoutGoal: number;
  };
  financialMetrics: {
    monthlyIncome?: number;
    monthlySavingsGoal?: number;
    emergencyFundGoal?: number;
    creditScore?: number;
    riskTolerance: string;
  };
  preferences: {
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
      achievements: boolean;
      challenges: boolean;
      social: boolean;
    };
    privacy: {
      profileVisibility: string;
      showRealName: boolean;
      showStats: boolean;
      showAchievements: boolean;
    };
    theme: string;
  };
  achievements: any[];
  teams: any[];
  activeChallenges: any[];
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (profileData: any) => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  phoneNumber?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const response = await apiService.getCurrentUser();
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      // If token is invalid, clear it
      await apiService.logout();
      setUser(null);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const response = await apiService.login(email, password);
      setUser(response.data.user);
      toast.success('Welcome back!');
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      setLoading(true);
      const response = await apiService.register(userData);
      setUser(response.data.user);
      toast.success('Welcome to WellnessHub!');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    apiService.logout();
    setUser(null);
    toast.success('Logged out successfully');
  };

  const updateProfile = async (profileData: any) => {
    try {
      const updatedUser = await apiService.updateProfile(profileData);
      setUser(updatedUser);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
      throw error;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('wellness_token');
      if (token) {
        await refreshUser();
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateProfile,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}