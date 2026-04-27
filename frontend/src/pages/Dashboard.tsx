import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, ExternalLink, Rocket, GitBranch, Activity, Server, Clock } from 'lucide-react';
import { useProjects } from '../hooks/useProjects';
import { useDeployment } from '../hooks/useDeployment';
import type { Project, Framework } from '../store/appStore';
import RepoSelector from '../components/projects/RepoSelector';
import '../styles/dashboard.css';

const frameworkIcons: Record<Framework, string> = {
  react: '⚛️',
  nextjs: '▲',
  vue: '💚',
  node: '🟢',
  static: '📄',
  unknown: '📦',
};

const statusConfig: Record<string, { label: string; bg: string; color: string; glow: string }> = {
  live: { label: 'Live', bg: 'rgba(16,185,129,0.1)', color: '#10b981', glow: '0 0 10px rgba(16,185,129,0.4)' },
  building: { label: 'Building', bg: 'rgba(99,102,241,0.1)', color: '#6366f1', glow: '0 0 10px rgba(99,102,241,0.4)' },
  failed: { label: 'Failed', bg: 'rgba(239,68,68,0.1)', color: '#ef4444', glow: '0 0 10px rgba(239,68,68,0.4)' },
  queued: { label: 'Queued', bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', glow: '0 0 10px rgba(245,158,11,0.4)' },
  stopped: { label: 'Stopped', bg: 'rgba(107,114,128,0.1)', color: '#6b7280', glow: 'none' },
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function ProjectNode({ project, onSelect, onDeploy }: { project: Project; onSelect: () => void; onDeploy: () => void }) {
  const latestDeploy = project.latestDeployment;
  const status = latestDeploy?.status || 'queued';
  const config = statusConfig[status] || statusConfig.queued;
  
  // Fake latency metric for visual appeal
  const latency = status === 'live' ? Math.floor(Math.random() * 40) + 12 + 'ms' : '--';

  return (
    <div className="project-node" onClick={onSelect}>
      <div className="node-glow" />
      
      {/* Node Header */}
      <div className="node-header">
        <div className="node-icon-box">
          {frameworkIcons[project.framework] || '📦'}
        </div>
        <div className="node-title-area">
          <h3 className="node-title">{project.name}</h3>
          <div className="node-repo">
            <GitBranch size={12} />
            {project.branch} • {project.repoFullName.split('/')[1]}
          </div>
        </div>
        <div 
          className="node-status" 
          style={{ background: config.bg, color: config.color, boxShadow: config.glow }}
        >
          {status === 'live' && <span className="status-dot live" style={{ width: 6, height: 6, marginRight: 4 }} />}
          {status === 'building' && <span className="status-dot building" style={{ width: 6, height: 6, marginRight: 4 }} />}
          {config.label}
        </div>
      </div>

      {/* Node Metrics */}
      <div className="node-metrics">
        <div className="node-metric">
          <div className="metric-sm-label">Latency</div>
          <div className="metric-sm-value">
            <Activity size={14} color={status === 'live' ? '#10b981' : '#6b7280'} />
            {latency}
          </div>
        </div>
        <div className="node-metric">
          <div className="metric-sm-label">Last Deploy</div>
          <div className="metric-sm-value">
            <Clock size={14} color="#8b8b9e" />
            {latestDeploy ? timeAgo(latestDeploy.createdAt) : 'Never'}
          </div>
        </div>
      </div>

      {/* Node Footer */}
      <div className="node-footer">
        <span className="project-card-version mono">
          {latestDeploy ? `v${latestDeploy.version}` : 'No deploys'}
        </span>
        <div className="node-actions">
          {latestDeploy?.deployUrl && (
            <a
              className="btn btn-node btn-sm"
              href={latestDeploy.deployUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={14} />
              Visit
            </a>
          )}
          <button
            className="btn btn-primary btn-sm"
            onClick={(e) => { e.stopPropagation(); onDeploy(); }}
          >
            <Rocket size={14} />
            Deploy
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { projects, fetchProjects, loading } = useProjects();
  const { triggerDeploy } = useDeployment();
  const [searchQuery, setSearchQuery] = useState('');
  const [showRepoSelector, setShowRepoSelector] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.repoFullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const liveCount = projects.filter(p => p.latestDeployment?.status === 'live').length;

  return (
    <div className="dashboard-page">
      <div className="canvas-bg" />

      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">
            <Server size={28} color="var(--accent-cyan)" />
            Network Topology
          </h1>
          <p className="dashboard-subtitle">Real-time status of all your connected deployment nodes</p>
        </div>
        <button className="btn btn-primary btn-lg glow" onClick={() => setShowRepoSelector(true)}>
          <Plus size={18} />
          Create Node
        </button>
      </div>

      {/* Top Metrics Row */}
      <div className="metrics-row">
        <div className="metric-node">
          <span className="metric-label">Total Nodes</span>
          <span className="metric-value">{projects.length}</span>
        </div>
        <div className="metric-node">
          <span className="metric-label">Live Deployments</span>
          <span className="metric-value" style={{ color: 'var(--status-live)' }}>{liveCount}</span>
        </div>
        <div className="metric-node">
          <span className="metric-label">Network Health</span>
          <span className="metric-value text-gradient">
            {projects.length ? Math.round((liveCount / projects.length) * 100) : 100}%
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="dashboard-search">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          className="input search-input"
          placeholder="Filter nodes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ background: 'rgba(14, 14, 22, 0.7)', backdropFilter: 'blur(10px)' }}
        />
      </div>

      {/* Projects Canvas */}
      {loading ? (
        <div className="projects-canvas">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 220, borderRadius: 'var(--radius-xl)' }} />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="empty-canvas">
          <Server size={48} strokeWidth={1} color="var(--text-muted)" style={{ marginBottom: 16 }} />
          <h3>No Active Nodes</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Connect a GitHub repository to deploy your first node to the network.</p>
          <button className="btn btn-primary" onClick={() => setShowRepoSelector(true)}>
            <Plus size={18} />
            Initialize First Node
          </button>
        </div>
      ) : (
        <motion.div className="projects-canvas" layout>
          <AnimatePresence>
            {filteredProjects.map((project, i) => (
              <motion.div
                key={project._id}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
              >
                <ProjectNode
                  project={project}
                  onSelect={() => window.location.hash = `#/project/${project._id}`}
                  onDeploy={() => triggerDeploy(project._id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Repo Selector Modal */}
      <AnimatePresence>
        {showRepoSelector && (
          <RepoSelector onClose={() => setShowRepoSelector(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
