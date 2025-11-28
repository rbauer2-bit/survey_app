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
}

export const api = new APIClient();
