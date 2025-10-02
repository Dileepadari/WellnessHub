const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('wellness_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  // Authentication
  async login(email: string, password: string) {
    const response = await this.request<{ success: boolean; data: { token: string; user: any } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    this.token = response.data.token;
    localStorage.setItem('wellness_token', response.data.token);
    return response;
  }

  async register(userData: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    phoneNumber?: string;
  }) {
    const response = await this.request<{ success: boolean; data: { token: string; user: any } }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    this.token = response.data.token;
    localStorage.setItem('wellness_token', response.data.token);
    return response;
  }

  async logout() {
    this.token = null;
    localStorage.removeItem('wellness_token');
  }

  async getCurrentUser() {
    return this.request<{ success: boolean; data: any }>('/auth/me');
  }

  // User Profile
  async updateProfile(profileData: any) {
    return this.request<any>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async getUserStats() {
    return this.request<any>('/users/stats');
  }

  // Health
  async getHealthMetrics() {
    return this.request<any>('/health/metrics');
  }

  async logHealthData(healthData: any) {
    return this.request<any>('/health/log', {
      method: 'POST',
      body: JSON.stringify(healthData),
    });
  }

  async getHealthGoals() {
    return this.request<any>('/health/goals');
  }

  async createHealthGoal(goalData: any) {
    return this.request<any>('/health/goals', {
      method: 'POST',
      body: JSON.stringify(goalData),
    });
  }

  // Wealth
  async getWealthData() {
    return this.request<any>('/wealth');
  }

  async addExpense(expenseData: any) {
    return this.request<any>('/wealth/expenses', {
      method: 'POST',
      body: JSON.stringify(expenseData),
    });
  }

  async addIncome(incomeData: any) {
    return this.request<any>('/wealth/income', {
      method: 'POST',
      body: JSON.stringify(incomeData),
    });
  }

  async getBudgets() {
    return this.request<any>('/wealth/budgets');
  }

  async createBudget(budgetData: any) {
    return this.request<any>('/wealth/budgets', {
      method: 'POST',
      body: JSON.stringify(budgetData),
    });
  }

  // Insurance
  async getInsurancePolicies() {
    return this.request<any>('/insurance/policies');
  }

  async addInsurancePolicy(policyData: any) {
    return this.request<any>('/insurance/policies', {
      method: 'POST',
      body: JSON.stringify(policyData),
    });
  }

  async getInsuranceRecommendations() {
    return this.request<any>('/insurance/recommendations');
  }

  // Challenges
  async getChallenges() {
    return this.request<any>('/challenges');
  }

  async joinChallenge(challengeId: string) {
    return this.request<any>(`/challenges/${challengeId}/join`, {
      method: 'POST',
    });
  }

  async completeChallenge(challengeId: string, completionData: any) {
    return this.request<any>(`/challenges/${challengeId}/complete`, {
      method: 'POST',
      body: JSON.stringify(completionData),
    });
  }

  async getUserChallenges() {
    return this.request<any>('/challenges/user');
  }

  // Community
  async getCommunityPosts() {
    return this.request<any>('/community/posts');
  }

  async createPost(postData: any) {
    return this.request<any>('/community/posts', {
      method: 'POST',
      body: JSON.stringify(postData),
    });
  }

  async likePost(postId: string) {
    return this.request<any>(`/community/posts/${postId}/like`, {
      method: 'POST',
    });
  }

  async commentOnPost(postId: string, comment: string) {
    return this.request<any>(`/community/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content: comment }),
    });
  }

  // Analytics
  async getAnalytics(period: string = '30d') {
    return this.request<any>(`/analytics?period=${period}`);
  }

  async getLeaderboard() {
    return this.request<any>('/analytics/leaderboard');
  }

  // Achievements
  async getAchievements() {
    return this.request<any>('/gamification/achievements');
  }

  async getUserAchievements() {
    return this.request<any>('/gamification/user-achievements');
  }

  // Teams
  async getTeams() {
    return this.request<any>('/gamification/teams');
  }

  async createTeam(teamData: any) {
    return this.request<any>('/gamification/teams', {
      method: 'POST',
      body: JSON.stringify(teamData),
    });
  }

  async joinTeam(teamId: string) {
    return this.request<any>(`/gamification/teams/${teamId}/join`, {
      method: 'POST',
    });
  }

  async getLeaderboards() {
    return this.request<any>('/gamification/leaderboards');
  }

  // Social Features
  async getFeed() {
    return this.request<any>('/community/feed');
  }

  async followUser(userId: string) {
    return this.request<any>(`/users/${userId}/follow`, {
      method: 'POST',
    });
  }

  async unfollowUser(userId: string) {
    return this.request<any>(`/users/${userId}/unfollow`, {
      method: 'POST',
    });
  }
}

export const apiService = new ApiService();
export default apiService;