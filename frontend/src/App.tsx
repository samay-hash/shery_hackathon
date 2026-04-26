import { useEffect, useState } from 'react';
import { useAuth } from './hooks/useAuth';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import ProjectDetail from './pages/ProjectDetail';
import DashboardLayout from './components/layout/DashboardLayout';
import { Loader2 } from 'lucide-react';
import './styles/index.css';
import './styles/animations.css';
import './styles/terminal.css';

function AuthCallback() {
  const { checkAuth } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('deployx_token', token);
      window.location.href = '/#/dashboard';
    }
  }, [checkAuth]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
      <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent-cyan)' }} />
    </div>
  );
}

function AppRouter() {
  const [route, setRoute] = useState(window.location.hash || '#/');

  useEffect(() => {
    const onHash = () => setRoute(window.location.hash || '#/');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Auth callback
  if (window.location.pathname === '/auth/callback') {
    return <AuthCallback />;
  }

  // Extract project ID from hash
  const projectMatch = route.match(/#\/project\/(.+)/);

  if (route === '#/dashboard' || projectMatch) {
    return (
      <DashboardLayout>
        {projectMatch ? (
          <ProjectDetail projectId={projectMatch[1]} />
        ) : (
          <Dashboard />
        )}
      </DashboardLayout>
    );
  }

  // Default: Landing
  return <Landing />;
}

export default function App() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--bg-primary)',
        gap: 12,
        color: 'var(--text-secondary)',
      }}>
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent-cyan)' }} />
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.9rem' }}>Loading DeployX...</span>
      </div>
    );
  }

  return <AppRouter />;
}
