import { useCallback, useState } from 'react';
import { useAppStore, type Deployment, type DeployStatus } from '../store/appStore';
import { deployAPI } from '../services/api';

export function useDeployment() {
  const {
    activeDeployment, setActiveDeployment,
    deploymentLogs, addDeploymentLog, clearDeploymentLogs,
    updateDeploymentStatus,
  } = useAppStore();
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deployments, setDeployments] = useState<Deployment[]>([]);

  const triggerDeploy = useCallback(async (projectId: string) => {
    setDeploying(true);
    setError(null);
    clearDeploymentLogs();
    try {
      const { data } = await deployAPI.trigger(projectId);
      setActiveDeployment(data.deployment);
      return data.deployment as Deployment;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Deploy failed';
      setError(message);
      throw err;
    } finally {
      setDeploying(false);
    }
  }, [setActiveDeployment, clearDeploymentLogs]);

  const fetchDeployments = useCallback(async (projectId: string) => {
    try {
      const { data } = await deployAPI.list(projectId);
      setDeployments(data.deployments);
      return data.deployments as Deployment[];
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch deployments';
      setError(message);
      return [];
    }
  }, []);

  const fetchDeployment = useCallback(async (id: string) => {
    try {
      const { data } = await deployAPI.get(id);
      setActiveDeployment(data.deployment);
      return data.deployment as Deployment;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch deployment';
      setError(message);
    }
  }, [setActiveDeployment]);

  const rollback = useCallback(async (deploymentId: string) => {
    try {
      const { data } = await deployAPI.rollback(deploymentId);
      setActiveDeployment(data.deployment);
      return data.deployment as Deployment;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Rollback failed';
      setError(message);
    }
  }, [setActiveDeployment]);

  const stopDeployment = useCallback(async (deploymentId: string) => {
    try {
      await deployAPI.stop(deploymentId);
      updateDeploymentStatus(deploymentId, 'stopped' as DeployStatus);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to stop';
      setError(message);
    }
  }, [updateDeploymentStatus]);

  return {
    activeDeployment, deploymentLogs, deploying, error, deployments,
    triggerDeploy, fetchDeployments, fetchDeployment,
    rollback, stopDeployment,
    addDeploymentLog, clearDeploymentLogs,
    setActiveDeployment,
  };
}
