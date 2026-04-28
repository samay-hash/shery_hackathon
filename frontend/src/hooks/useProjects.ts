import { useCallback, useState } from 'react';
import { useAppStore, type Project } from '../store/appStore';
import { projectAPI, githubAPI } from '../services/api';

export function useProjects() {
  const { projects, setProjects, selectedProject, setSelectedProject, addProject, updateProject, removeProject, githubRepos, setGithubRepos } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await projectAPI.list();
      setProjects(data.projects);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch projects';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [setProjects]);

  const fetchProject = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const { data } = await projectAPI.get(id);
      setSelectedProject(data.project);
      return data.project;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch project';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [setSelectedProject]);

  const createProject = useCallback(async (repoUrl: string, name: string, branch?: string, rootDir?: string) => {
    setLoading(true);
    try {
      const { data } = await projectAPI.create({ repoUrl, name, branch, rootDir });
      addProject(data.project);
      return data.project as Project;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create project';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [addProject]);

  const editProject = useCallback(async (id: string, updates: Record<string, unknown>) => {
    try {
      const { data } = await projectAPI.update(id, updates);
      updateProject(id, data.project);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update project';
      setError(message);
    }
  }, [updateProject]);

  const deleteProject = useCallback(async (id: string) => {
    try {
      await projectAPI.delete(id);
      removeProject(id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete project';
      setError(message);
    }
  }, [removeProject]);

  const updateEnvVars = useCallback(async (id: string, envVars: Record<string, string>) => {
    try {
      await projectAPI.updateEnv(id, envVars);
      updateProject(id, { envVars });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update env vars';
      setError(message);
    }
  }, [updateProject]);

  const fetchGithubRepos = useCallback(async () => {
    try {
      const { data } = await githubAPI.listRepos();
      setGithubRepos(data.repos);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch repos';
      setError(message);
    }
  }, [setGithubRepos]);

  return {
    projects, selectedProject, loading, error,
    githubRepos,
    fetchProjects, fetchProject, createProject, editProject,
    deleteProject, updateEnvVars, fetchGithubRepos,
    setSelectedProject,
  };
}
