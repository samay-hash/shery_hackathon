import { create } from 'zustand';

export type DeployStatus = 'queued' | 'building' | 'deploying' | 'live' | 'failed' | 'rolled-back' | 'stopped';
export type Framework = 'react' | 'nextjs' | 'vue' | 'node' | 'static' | 'unknown';

export interface User {
  _id: string;
  githubId: string;
  username: string;
  email: string;
  avatarUrl: string;
}

export interface Project {
  _id: string;
  name: string;
  repoUrl: string;
  repoFullName: string;
  branch: string;
  framework: Framework;
  buildCommand: string;
  startCommand: string;
  outputDir: string;
  rootDir: string;
  envVars: Record<string, string>;
  customDomain?: string;
  autoDeployEnabled: boolean;
  status: 'active' | 'paused' | 'deleted';
  deployments: Deployment[];
  latestDeployment?: Deployment;
  createdAt: string;
  updatedAt: string;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  source: 'build' | 'deploy' | 'runtime';
}

export interface Deployment {
  _id: string;
  project: string;
  version: number;
  commitHash: string;
  commitMessage: string;
  branch: string;
  status: DeployStatus;
  buildDuration: number;
  containerId?: string;
  deployUrl?: string;
  logs: LogEntry[];
  triggeredBy: 'manual' | 'webhook' | 'rollback';
  createdAt: string;
  finishedAt?: string;
}

export interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  language: string;
  default_branch: string;
  private: boolean;
  updated_at: string;
  stargazers_count: number;
}

interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;

  // Projects
  projects: Project[];
  selectedProject: Project | null;
  setProjects: (projects: Project[]) => void;
  setSelectedProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, data: Partial<Project>) => void;
  removeProject: (id: string) => void;

  // Deployments
  activeDeployment: Deployment | null;
  deploymentLogs: LogEntry[];
  setActiveDeployment: (deployment: Deployment | null) => void;
  addDeploymentLog: (log: LogEntry) => void;
  clearDeploymentLogs: () => void;
  updateDeploymentStatus: (id: string, status: DeployStatus) => void;

  // UI
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  currentView: 'dashboard' | 'project' | 'deployment' | 'settings';
  setCurrentView: (view: 'dashboard' | 'project' | 'deployment' | 'settings') => void;

  // GitHub Repos
  githubRepos: GithubRepo[];
  setGithubRepos: (repos: GithubRepo[]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Auth
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setLoading: (isLoading) => set({ isLoading }),

  // Projects
  projects: [],
  selectedProject: null,
  setProjects: (projects) => set({ projects }),
  setSelectedProject: (selectedProject) => set({ selectedProject }),
  addProject: (project) => set((state) => ({ projects: [...state.projects, project] })),
  updateProject: (id, data) => set((state) => ({
    projects: state.projects.map((p) => p._id === id ? { ...p, ...data } : p),
    selectedProject: state.selectedProject?._id === id ? { ...state.selectedProject, ...data } : state.selectedProject,
  })),
  removeProject: (id) => set((state) => ({
    projects: state.projects.filter((p) => p._id !== id),
    selectedProject: state.selectedProject?._id === id ? null : state.selectedProject,
  })),

  // Deployments
  activeDeployment: null,
  deploymentLogs: [],
  setActiveDeployment: (activeDeployment) => set({ activeDeployment }),
  addDeploymentLog: (log) => set((state) => ({ deploymentLogs: [...state.deploymentLogs, log] })),
  clearDeploymentLogs: () => set({ deploymentLogs: [] }),
  updateDeploymentStatus: (id, status) => set((state) => ({
    activeDeployment: state.activeDeployment?._id === id
      ? { ...state.activeDeployment, status }
      : state.activeDeployment,
  })),

  // UI
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  currentView: 'dashboard',
  setCurrentView: (currentView) => set({ currentView }),

  // GitHub Repos
  githubRepos: [],
  setGithubRepos: (githubRepos) => set({ githubRepos }),
}));
