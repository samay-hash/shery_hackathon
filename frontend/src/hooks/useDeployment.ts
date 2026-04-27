import { useCallback, useState, useEffect, useRef } from 'react';
import { io as socketIO, Socket } from 'socket.io-client';
import { useAppStore, type Deployment, type DeployStatus } from '../store/appStore';
import { deployAPI } from '../services/api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export function useDeployment() {
  const {
    activeDeployment, setActiveDeployment,
    deploymentLogs, addDeploymentLog, clearDeploymentLogs,
    updateDeploymentStatus,
  } = useAppStore();
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const currentDeployIdRef = useRef<string | null>(null);

  // Setup socket connection once
  useEffect(() => {
    const token = localStorage.getItem('deployx_token');
    const socket = socketIO(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      // Rejoin room if we were watching a deployment
      if (currentDeployIdRef.current) {
        socket.emit('join:deployment', currentDeployIdRef.current);
      }
    });

    // Real-time log from backend worker
    socket.on('deploy:log', (logEntry: { message: string; level: string; timestamp: string }) => {
      addDeploymentLog(logEntry);
    });

    // Status change from backend worker
    socket.on('deploy:status', ({ deploymentId, status }: { deploymentId: string; status: DeployStatus }) => {
      updateDeploymentStatus(deploymentId, status);
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
    });

    return () => {
      socket.disconnect();
    };
  }, [addDeploymentLog, updateDeploymentStatus]);

  const triggerDeploy = useCallback(async (projectId: string) => {
    setDeploying(true);
    setError(null);
    clearDeploymentLogs();
    try {
      const { data } = await deployAPI.trigger(projectId);
      const deployment = data.deployment as Deployment;
      setActiveDeployment(deployment);
      currentDeployIdRef.current = deployment._id;

      // Join Socket.io room to receive live logs for this deployment
      if (socketRef.current?.connected) {
        socketRef.current.emit('join:deployment', deployment._id);
        console.log('[Socket] Joined deployment room:', deployment._id);
      }
      return deployment;
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
