import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('deployx_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('deployx_token');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

// ---- Auth ----
export const authAPI = {
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  getGithubAuthUrl: () => `${API_BASE}/auth/github`,
};

// ---- Projects ----
export const projectAPI = {
  list: () => api.get('/projects'),
  get: (id: string) => api.get(`/projects/${id}`),
  create: (data: { repoUrl: string; name: string; branch?: string; rootDir?: string }) => api.post('/projects', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  updateEnv: (id: string, envVars: Record<string, string>) => api.put(`/projects/${id}/env`, { envVars }),
};

// ---- Deployments ----
export const deployAPI = {
  trigger: (projectId: string) => api.post(`/projects/${projectId}/deploy`),
  list: (projectId: string) => api.get(`/projects/${projectId}/deployments`),
  get: (id: string) => api.get(`/deployments/${id}`),
  getLogs: (id: string) => api.get(`/deployments/${id}/logs`),
  rollback: (id: string) => api.post(`/deployments/${id}/rollback`),
  stop: (id: string) => api.post(`/deployments/${id}/stop`),
};

// ---- GitHub ----
export const githubAPI = {
  listRepos: () => api.get('/github/repos'),
};

// ---- AI ----
export const aiAPI = {
  analyzeError: (deploymentId: string) => api.post('/ai/analyze-error', { deploymentId }),
  scanProject: (projectId: string) => api.post('/ai/scan-project', { projectId }),
  deploySummary: (deploymentId: string) => api.post('/ai/deploy-summary', { deploymentId }),
};

// ---- Admin ----
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getUsers: () => api.get('/admin/users'),
  getDeployments: () => api.get('/admin/deployments'),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
};

export default api;
