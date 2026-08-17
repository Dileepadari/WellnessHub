import type { ApiResponse, AuthPayload, RegisterData, User } from '@/types';

// Same-origin by default: the Vite dev proxy and the production nginx both
// forward /api to the backend, so the browser never makes a cross-origin call.
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'wellness_token';

/** Thrown for any non-2xx response, carrying the status for callers that branch on it. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type Listener = () => void;
type Json = Record<string, unknown>;

const qs = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const out = search.toString();
  return out ? `?${out}` : '';
};

class ApiService {
  private token: string | null = localStorage.getItem(TOKEN_KEY);
  private unauthorizedListeners = new Set<Listener>();

  getToken() {
    return this.token;
  }

  /**
   * Fires when the server rejects our token. AuthContext subscribes so an
   * expired session drops the UI to the sign-in screen instead of leaving it
   * signed in with every request failing.
   */
  onUnauthorized(listener: Listener): () => void {
    this.unauthorizedListeners.add(listener);
    return () => {
      this.unauthorizedListeners.delete(listener);
    };
  }

  private setToken(token: string | null) {
    this.token = token;
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    if (!headers.has('Content-Type') && options.body) {
      headers.set('Content-Type', 'application/json');
    }
    if (this.token) headers.set('Authorization', `Bearer ${this.token}`);

    const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });

    if (response.status === 401) {
      this.setToken(null);
      this.unauthorizedListeners.forEach((listener) => listener());
    }

    const body = response.status === 204 ? null : await response.json().catch(() => null);

    if (!response.ok) {
      throw new ApiError(
        (body as { message?: string } | null)?.message ??
          `Request failed with status ${response.status}`,
        response.status
      );
    }

    return body as T;
  }

  private get<T>(endpoint: string) {
    return this.request<T>(endpoint);
  }
  private post<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: 'POST',
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
  }
  private put<T>(endpoint: string, body: unknown) {
    return this.request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) });
  }
  private del<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // --- Auth ---
  async login(email: string, password: string) {
    const res = await this.post<ApiResponse<AuthPayload>>('/auth/login', { email, password });
    this.setToken(res.data.token);
    return res;
  }

  async register(userData: RegisterData) {
    const res = await this.post<ApiResponse<AuthPayload>>('/auth/register', userData);
    this.setToken(res.data.token);
    return res;
  }

  logout() {
    this.setToken(null);
  }

  getCurrentUser() {
    return this.get<ApiResponse<{ user: User }>>('/auth/me');
  }

  // --- Users ---
  updateProfile(data: Partial<User>) {
    return this.put<ApiResponse<{ user: User }>>('/users/profile', data);
  }
  getUserStats() {
    return this.get<ApiResponse<Json>>('/users/stats');
  }
  getUserLeaderboard() {
    return this.get<ApiResponse<Json>>('/users/leaderboard');
  }

  // --- Health ---
  getHealthMetricDefs() {
    return this.get<ApiResponse<Json>>('/health/metrics');
  }
  getHealthSummary(days = 7) {
    return this.get<ApiResponse<Json>>(`/health/summary${qs({ days })}`);
  }
  getActivities(limit = 25) {
    return this.get<ApiResponse<Json>>(`/health/activities${qs({ limit })}`);
  }
  logActivity(payload: Json) {
    return this.post<ApiResponse<Json>>('/health/activities', payload);
  }
  deleteActivity(id: string) {
    return this.del<ApiResponse<Json>>(`/health/activities/${id}`);
  }
  updateHealthGoals(payload: Json) {
    return this.put<ApiResponse<Json>>('/health/goals', payload);
  }

  // --- Wealth ---
  getWealthCategories() {
    return this.get<ApiResponse<Json>>('/wealth/categories');
  }
  getWealthSummary(months = 6) {
    return this.get<ApiResponse<Json>>(`/wealth/summary${qs({ months })}`);
  }
  getTransactions(params: { limit?: number; kind?: string; month?: string } = {}) {
    return this.get<ApiResponse<Json>>(`/wealth/transactions${qs(params)}`);
  }
  createTransaction(payload: Json) {
    return this.post<ApiResponse<Json>>('/wealth/transactions', payload);
  }
  deleteTransaction(id: string) {
    return this.del<ApiResponse<Json>>(`/wealth/transactions/${id}`);
  }
  getWealthGoals() {
    return this.get<ApiResponse<Json>>('/wealth/goals');
  }
  createWealthGoal(payload: Json) {
    return this.post<ApiResponse<Json>>('/wealth/goals', payload);
  }
  addGoalContribution(id: string, payload: Json) {
    return this.post<ApiResponse<Json>>(`/wealth/goals/${id}/contributions`, payload);
  }
  deleteWealthGoal(id: string) {
    return this.del<ApiResponse<Json>>(`/wealth/goals/${id}`);
  }
  updateWealthProfile(payload: Json) {
    return this.put<ApiResponse<Json>>('/wealth/profile', payload);
  }

  // --- Insurance ---
  getPolicyTypes() {
    return this.get<ApiResponse<Json>>('/insurance/types');
  }
  getPolicies() {
    return this.get<ApiResponse<Json>>('/insurance/policies');
  }
  createPolicy(payload: Json) {
    return this.post<ApiResponse<Json>>('/insurance/policies', payload);
  }
  deletePolicy(id: string) {
    return this.del<ApiResponse<Json>>(`/insurance/policies/${id}`);
  }
  getInsuranceAlerts() {
    return this.get<ApiResponse<Json>>('/insurance/alerts');
  }
  getCoverage() {
    return this.get<ApiResponse<Json>>('/insurance/coverage');
  }

  // --- Challenges ---
  getChallenges(params: { category?: string } = {}) {
    return this.get<ApiResponse<Json>>(`/challenges${qs(params)}`);
  }
  getMyChallenges() {
    return this.get<ApiResponse<Json>>('/challenges/mine');
  }
  joinChallenge(id: string) {
    return this.post<ApiResponse<Json>>(`/challenges/${id}/join`);
  }
  updateChallengeProgress(id: string, payload: Json) {
    return this.post<ApiResponse<Json>>(`/challenges/${id}/progress`, payload);
  }

  // --- Community ---
  getCommunityFeed(limit = 25) {
    return this.get<ApiResponse<Json>>(`/community/feed${qs({ limit })}`);
  }
  shareToCommunity(payload: Json) {
    return this.post<ApiResponse<Json>>('/community/share', payload);
  }
  getCommunityLeaderboard() {
    return this.get<ApiResponse<Json>>('/community/leaderboard');
  }
  getTeams() {
    return this.get<ApiResponse<Json>>('/community/teams');
  }
  joinTeam(id: string) {
    return this.post<ApiResponse<Json>>(`/community/teams/${id}/join`);
  }

  // --- Gamification ---
  getAchievements() {
    return this.get<ApiResponse<Json>>('/gamification/achievements');
  }
  getProgress() {
    return this.get<ApiResponse<Json>>('/gamification/progress');
  }
  claimDailyBonus() {
    return this.post<ApiResponse<Json>>('/gamification/daily-bonus');
  }

  // --- Analytics ---
  getDashboard(period = '30d') {
    return this.get<ApiResponse<Json>>(`/analytics/dashboard${qs({ period })}`);
  }
  getTrends(period = '30d') {
    return this.get<ApiResponse<Json>>(`/analytics/trends${qs({ period })}`);
  }
}

export const apiService = new ApiService();
export default apiService;
