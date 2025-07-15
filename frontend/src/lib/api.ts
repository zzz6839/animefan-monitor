import axios from 'axios';
import { getApiBaseUrl } from './config';
import type { DownloadRule, RSSFeedItem } from './types';

const API_BASE_URL = getApiBaseUrl();

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Download Rules API
export const rulesApi = {
  getAll: () => apiClient.get<DownloadRule[]>('/api/rules'),
  getById: (id: string) => apiClient.get<DownloadRule>(`/api/rules/${id}`),
  create: (rule: Omit<DownloadRule, 'id' | 'created_at' | 'last_updated'>) => 
    apiClient.post<DownloadRule>('/api/rules', rule),
  update: (id: string, rule: Partial<DownloadRule>) => 
    apiClient.put<DownloadRule>(`/api/rules/${id}`, rule),
  delete: (id: string) => apiClient.delete(`/api/rules/${id}`),
};

// RSS Feed API
export const rssApi = {
  getItems: (ruleId: string) => apiClient.get<RSSFeedItem[]>(`/api/rss/${ruleId}/items`),
  preview: (rss_url: string) => apiClient.post('/api/rss/preview', { rss_url }),
};

// Settings API
export const settingsApi = {
  get: () => apiClient.get('/api/settings'),
  update: (settings: any) => apiClient.put('/api/settings', settings),
};

// Tasks API
export const tasksApi = {
  getAll: () => apiClient.get('/api/tasks'),
  create: (task: any) => apiClient.post('/api/tasks', task),
  delete: (id: string) => apiClient.delete(`/api/tasks/${id}`),
};

export default apiClient;
