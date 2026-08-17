import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { apiService } from '@/services/api';
import type { RegisterData, User } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (profileData: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const response = await apiService.getCurrentUser();
    setUser(response.data.user);
  }, []);

  const logout = useCallback(() => {
    apiService.logout();
    setUser(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await apiService.login(email, password);
      setUser(response.data.user);
      toast.success('Welcome back!');
    } catch (error) {
      toast.error(errorMessage(error, 'Login failed'));
      throw error;
    }
  }, []);

  const register = useCallback(async (userData: RegisterData) => {
    try {
      const response = await apiService.register(userData);
      setUser(response.data.user);
      toast.success('Welcome to WellnessHub!');
    } catch (error) {
      toast.error(errorMessage(error, 'Registration failed'));
      throw error;
    }
  }, []);

  const updateProfile = useCallback(async (profileData: Partial<User>) => {
    try {
      const response = await apiService.updateProfile(profileData);
      setUser(response.data.user);
      toast.success('Profile updated');
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to update profile'));
      throw error;
    }
  }, []);

  // A token rejected by the server means the session is over, whether it expired
  // or was revoked. Drop it here so the UI never sits in a broken signed-in state.
  useEffect(
    () =>
      apiService.onUnauthorized(() => {
        setUser(null);
      }),
    []
  );

  useEffect(() => {
    let cancelled = false;

    const initAuth = async () => {
      if (apiService.getToken()) {
        try {
          await refreshUser();
        } catch {
          // A stale token is not an error worth showing on first paint.
          apiService.logout();
        }
      }
      if (!cancelled) setLoading(false);
    };

    void initAuth();
    return () => {
      cancelled = true;
    };
  }, [refreshUser]);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, updateProfile, refreshUser }),
    [user, loading, login, register, logout, updateProfile, refreshUser]
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const context = use(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
