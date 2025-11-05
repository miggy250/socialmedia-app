// API client to replace Supabase integration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('auth_token');
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Auth methods
  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  async register(data: {
    email: string;
    password: string;
    username: string;
    fullName?: string;
  }) {
    const response = await this.request<{
      token: string;
      user: any;
      message: string;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    this.setToken(response.token);
    return response;
  }

  async login(email: string, password: string) {
    const response = await this.request<{
      token: string;
      user: any;
      message: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    this.setToken(response.token);
    return response;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.clearToken();
    }
  }

  async getCurrentUser() {
    return this.request<{ user: any }>('/auth/me');
  }

  // Posts methods
  async getPosts(page = 1, limit = 10) {
    return this.request<{ posts: any[] }>(`/posts?page=${page}&limit=${limit}`);
  }

  async createPost(data: { content: string; imageUrl?: string }) {
    return this.request<{ post: any }>('/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async likePost(postId: string) {
    return this.request<{ liked: boolean; message: string }>(`/posts/${postId}/like`, {
      method: 'POST',
    });
  }

  async getComments(postId: string) {
    return this.request<{ comments: any[] }>(`/posts/${postId}/comments`);
  }

  async addComment(postId: string, content: string) {
    return this.request<{ comment: any }>(`/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async getUserPosts(userId: string) {
    return this.request<{ posts: any[] }>(`/posts/user/${userId}`);
  }

  async savePost(postId: string) {
    return this.request<{ saved: boolean; message: string }>(`/posts/${postId}/save`, {
      method: 'POST',
    });
  }

  async getSavedPosts() {
    return this.request<{ posts: any[] }>('/posts/saved');
  }

  // Users methods
  async getUserSuggestions() {
    return this.request<{ suggestions: any[] }>('/users/suggestions');
  }

  async followUser(userId: string) {
    return this.request<{ message: string }>(`/users/${userId}/follow`, {
      method: 'POST',
    });
  }

  async unfollowUser(userId: string) {
    return this.request<{ message: string }>(`/users/${userId}/follow`, {
      method: 'DELETE',
    });
  }

  async getProfile(userId?: string) {
    const endpoint = userId ? `/users/${userId}/profile` : '/users/me/profile';
    return this.request<{ profile: any }>(endpoint);
  }

  async updateProfile(data: {
    fullName?: string;
    bio?: string;
    location?: string;
    avatarUrl?: string;
  }) {
    return this.request<{ message: string }>('/users/me/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getNotifications(limit = 20) {
    const search = new URLSearchParams({ limit: String(limit) });
    return this.request<{ notifications: any[] }>(`/notifications?${search.toString()}`);
  }

  async markNotificationRead(id: string) {
    return this.request<{ message: string }>(`/notifications/${id}/read`, {
      method: 'POST',
    });
  }

  // Messages
  async getConversations() {
    return this.request<{ conversations: any[] }>(`/messages/conversations`);
  }

  async getThread(userId: string) {
    return this.request<{ messages: any[] }>(`/messages/thread/${userId}`);
  }

  async sendMessage(receiverId: string, content: string) {
    return this.request<{ message: string }>(`/messages/send`, {
      method: 'POST',
      body: JSON.stringify({ receiverId, content }),
    });
  }

  async markThreadRead(userId: string) {
    return this.request<{ message: string }>(`/messages/thread/${userId}/read`, {
      method: 'POST',
    });
  }

  // Admin
  async adminListUsers(params?: { q?: string; limit?: number }) {
    const search = new URLSearchParams();
    if (params?.q) search.set('q', params.q);
    if (params?.limit) search.set('limit', String(params.limit));
    const qs = search.toString();
    const path = qs ? `/admin/users?${qs}` : '/admin/users';
    return this.request<{ users: any[] }>(path);
  }

  async adminDeactivateUser(id: string) {
    return this.request<{ message: string }>(`/admin/users/${id}/deactivate`, { method: 'POST' });
  }

  async adminReactivateUser(id: string) {
    return this.request<{ message: string }>(`/admin/users/${id}/reactivate`, { method: 'POST' });
  }

  async adminSoftDeleteUser(id: string, confirm: string) {
    return this.request<{ message: string }>(`/admin/users/${id}/soft-delete`, {
      method: 'POST',
      body: JSON.stringify({ confirm }),
    });
  }

  // Upload
  async uploadImage(file: File) {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await fetch(`${this.baseURL}/uploads/image`, {
      method: 'POST',
      headers: {
        'Authorization': this.token ? `Bearer ${this.token}` : '',
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    return response.json() as Promise<{ imageUrl: string }>;
  }

  // Explore
  async getTrendingPosts(limit = 20) {
    return this.request<{ posts: any[] }>(`/explore/trending?limit=${limit}`);
  }

  async getTrendingHashtags(limit = 10) {
    return this.request<{ hashtags: any[] }>(`/explore/hashtags?limit=${limit}`);
  }

  async getHashtagPosts(hashtag: string, limit = 20) {
    return this.request<{ posts: any[]; hashtag: string }>(`/explore/hashtag/${encodeURIComponent(hashtag)}?limit=${limit}`);
  }

  // Search
  async search(query: string) {
    return this.request<{ users: any[]; posts: any[]; hashtags: any[] }>(`/search?q=${encodeURIComponent(query)}`);
  }

  async searchUsers(query: string, limit = 20) {
    return this.request<{ users: any[] }>(`/search/users?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  // Stories
  async getStories() {
    return this.request<{ stories: any[] }>('/stories');
  }

  async getUserStories(userId: string) {
    return this.request<{ stories: any[] }>(`/stories/user/${userId}`);
  }

  async createStory(data: { imageUrl: string; caption?: string }) {
    return this.request<{ story: any }>('/stories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async markStoryViewed(storyId: string) {
    return this.request<{ message: string }>(`/stories/${storyId}/view`, {
      method: 'POST',
    });
  }

  async deleteStory(storyId: string) {
    return this.request<{ message: string }>(`/stories/${storyId}`, {
      method: 'DELETE',
    });
  }

  async getStoryViewers(storyId: string) {
    return this.request<{ viewers: any[] }>(`/stories/${storyId}/viewers`);
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

// Helper function for React Query error handling
export const handleApiError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
};
