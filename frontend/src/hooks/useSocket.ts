import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppStore, type LogEntry, type DeployStatus } from '../store/appStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { addDeploymentLog, updateDeploymentStatus } = useAppStore();

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const token = localStorage.getItem('deployx_token');
    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current.on('connect', () => {
      console.log('🔌 Socket connected');
    });

    socketRef.current.on('deploy:log', (log: LogEntry) => {
      addDeploymentLog(log);
    });

    socketRef.current.on('deploy:status', (data: { deploymentId: string; status: DeployStatus }) => {
      updateDeploymentStatus(data.deploymentId, data.status);
    });

    socketRef.current.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
    });
  }, [addDeploymentLog, updateDeploymentStatus]);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
  }, []);

  const joinDeploymentRoom = useCallback((deploymentId: string) => {
    socketRef.current?.emit('join:deployment', deploymentId);
  }, []);

  const leaveDeploymentRoom = useCallback((deploymentId: string) => {
    socketRef.current?.emit('leave:deployment', deploymentId);
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return { connect, disconnect, joinDeploymentRoom, leaveDeploymentRoom, socket: socketRef };
}
