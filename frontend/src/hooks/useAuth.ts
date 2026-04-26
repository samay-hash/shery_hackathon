import { useEffect, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { authAPI } from '../services/api';

export function useAuth() {
  const { user, isAuthenticated, isLoading, setUser, setLoading } = useAppStore();

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('deployx_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await authAPI.getMe();
      setUser(data.user);
    } catch {
      localStorage.removeItem('deployx_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [setUser, setLoading]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = () => {
    window.location.href = authAPI.getGithubAuthUrl();
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch {
      // ignore
    }
    localStorage.removeItem('deployx_token');
    setUser(null);
    window.location.href = '/';
  };

  return { user, isAuthenticated, isLoading, login, logout, checkAuth };
}
