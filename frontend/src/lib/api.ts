import axios, { AxiosInstance, AxiosError } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async register(data: {
    email: string;
    password: string;
    name: string;
    company_name?: string;
  }) {
    return this.client.post('/auth/register', data);
  }

  async login(email: string, password: string) {
    return this.client.post('/auth/login', { email, password });
  }

  async getMe() {
    return this.client.get('/auth/me');
  }

  async updateProfile(data: { name?: string; company_name?: string }) {
    return this.client.patch('/auth/me', data);
  }

  // Assessment endpoints
  async createAssessment(data: any) {
    return this.client.post('/assessments', data);
  }

  async getAssessments() {
    return this.client.get('/assessments');
  }

  async getAssessment(id: string) {
    return this.client.get(`/assessments/${id}`);
  }

  async updateAssessment(id: string, data: any) {
    return this.client.patch(`/assessments/${id}`, data);
  }

  async deleteAssessment(id: string) {
    return this.client.delete(`/assessments/${id}`);
  }

  async publishAssessment(id: string) {
    return this.client.post(`/assessments/${id}/publish`);
  }

  async addQuestion(assessmentId: string, data: any) {
    return this.client.post(`/assessments/${assessmentId}/questions`, data);
  }

  async addScoreRange(assessmentId: string, data: any) {
    return this.client.post(`/assessments/${assessmentId}/score-ranges`, data);
  }

  async getAssessmentStats(id: string) {
    return this.client.get(`/assessments/${id}/stats`);
  }

  // Response endpoints
  async getPublicAssessment(slug: string) {
    return this.client.get(`/responses/public/${slug}`);
  }

  async submitResponse(slug: string, data: any) {
    return this.client.post(`/responses/public/${slug}/submit`, data);
  }

  async getResponses(assessmentId: string, limit = 50, offset = 0) {
    return this.client.get(`/responses/assessment/${assessmentId}`, {
      params: { limit, offset },
    });
  }

  async getResponse(id: string) {
    return this.client.get(`/responses/${id}`);
  }

  async getScoreDistribution(assessmentId: string) {
    return this.client.get(`/responses/assessment/${assessmentId}/distribution`);
  }

  // Email sequence endpoints
  async createEmailSequence(data: any) {
    return this.client.post('/email-sequences', data);
  }

  async getEmailSequences(assessmentId: string) {
    return this.client.get(`/email-sequences/assessment/${assessmentId}`);
  }

  async updateEmailSequence(id: string, data: any) {
    return this.client.patch(`/email-sequences/${id}`, data);
  }

  async deleteEmailSequence(id: string) {
    return this.client.delete(`/email-sequences/${id}`);
  }

  async addEmailTemplate(sequenceId: string, data: any) {
    return this.client.post(`/email-sequences/${sequenceId}/templates`, data);
  }

  async getEmailTemplates(sequenceId: string) {
    return this.client.get(`/email-sequences/${sequenceId}/templates`);
  }

  async updateEmailTemplate(id: string, data: any) {
    return this.client.patch(`/email-sequences/templates/${id}`, data);
  }

  async deleteEmailTemplate(id: string) {
    return this.client.delete(`/email-sequences/templates/${id}`);
  }

  // Custom domain endpoints
  async getCustomDomains() {
    return this.client.get('/custom-domains');
  }

  async getCustomDomain(id: string) {
    return this.client.get(`/custom-domains/${id}`);
  }

  async createCustomDomain(data: {
    domain: string;
    subdomain?: string;
    assessment_id?: string;
  }) {
    return this.client.post('/custom-domains', data);
  }

  async updateCustomDomain(id: string, data: { assessment_id?: string }) {
    return this.client.patch(`/custom-domains/${id}`, data);
  }

  async deleteCustomDomain(id: string) {
    return this.client.delete(`/custom-domains/${id}`);
  }

  async verifyCustomDomain(id: string) {
    return this.client.post(`/custom-domains/${id}/verify`);
  }

  async activateCustomDomain(id: string) {
    return this.client.post(`/custom-domains/${id}/activate`);
  }

  async deactivateCustomDomain(id: string) {
    return this.client.post(`/custom-domains/${id}/deactivate`);
  }

  async getCustomDomainAnalytics(id: string, days = 30) {
    return this.client.get(`/custom-domains/${id}/analytics`, {
      params: { days },
    });
  }

  // Analytics endpoints
  async getAnalyticsOverview(assessmentId: string) {
    return this.client.get(`/analytics/assessments/${assessmentId}/overview`);
  }

  async getQuestionAnalytics(assessmentId: string) {
    return this.client.get(`/analytics/assessments/${assessmentId}/questions`);
  }

  async getScoreDistributionAnalytics(assessmentId: string) {
    return this.client.get(`/analytics/assessments/${assessmentId}/score-distribution`);
  }

  async getResponseTrends(assessmentId: string, interval: 'day' | 'week' | 'month' = 'day', limit = 30) {
    return this.client.get(`/analytics/assessments/${assessmentId}/trends`, {
      params: { interval, limit },
    });
  }

  async generateInsights(assessmentId: string) {
    return this.client.post(`/analytics/assessments/${assessmentId}/generate-insights`);
  }

  async getInsights(assessmentId: string) {
    return this.client.get(`/analytics/assessments/${assessmentId}/insights`);
  }

  async generateContentSuggestions(assessmentId: string) {
    return this.client.post(`/analytics/assessments/${assessmentId}/content-suggestions`);
  }

  async generateTrendAnalysis(assessmentId: string) {
    return this.client.post(`/analytics/assessments/${assessmentId}/trend-analysis`);
  }

  async getAnalyticsDashboard() {
    return this.client.get('/analytics/dashboard');
  }

  // Admin user management endpoints
  async getAllUsers(page = 1, limit = 50) {
    return this.client.get('/admin/users', {
      params: { page, limit },
    });
  }

  async getUserStats() {
    return this.client.get('/admin/users/stats');
  }

  async getUser(id: string) {
    return this.client.get(`/admin/users/${id}`);
  }

  async createUser(data: {
    email: string;
    password: string;
    name: string;
    company_name?: string;
    role: 'super_admin' | 'assistant_admin' | 'client' | 'respondent';
  }) {
    return this.client.post('/admin/users', data);
  }

  async updateUserRole(id: string, role: string) {
    return this.client.patch(`/admin/users/${id}/role`, { role });
  }

  async updateUser(id: string, data: any) {
    return this.client.patch(`/admin/users/${id}`, data);
  }

  async deleteUser(id: string) {
    return this.client.delete(`/admin/users/${id}`);
  }

  async getAuditLogs(limit = 100, offset = 0) {
    return this.client.get('/admin/users/audit-logs/all', {
      params: { limit, offset },
    });
  }

  async getUserAuditLogs(userId: string, limit = 50) {
    return this.client.get(`/admin/users/audit-logs/user/${userId}`, {
      params: { limit },
    });
  }

  // SMTP Settings endpoints
  async getSMTPSettings() {
    return this.client.get('/smtp-settings');
  }

  async updateSMTPSettings(data: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
    from_email: string;
    from_name: string;
  }) {
    return this.client.post('/smtp-settings', data);
  }

  async testSMTPSettings(data: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
    from_email: string;
    from_name: string;
    test_email: string;
  }) {
    return this.client.post('/smtp-settings/test', data);
  }

  async deleteSMTPSettings() {
    return this.client.delete('/smtp-settings');
  }
}

export const api = new APIClient();
