import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Folder, Clock, ExternalLink, Rocket, GitBranch, ChevronRight } from 'lucide-react';
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

const statusConfig: Record<string, { label: string; class: string }> = {
  live: { label: 'Live', class: 'badge-live' },
  building: { label: 'Building', class: 'badge-building' },
  failed: { label: 'Failed', class: 'badge-failed' },
  queued: { label: 'Queued', class: 'badge-queued' },
  deploying: { label: 'Deploying', class: 'badge-building' },
  stopped: { label: 'Stopped', class: 'badge-queued' },
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

function ProjectCard({ project, onSelect, onDeploy }: { project: Project; onSelect: () => void; onDeploy: () => void }) {
  const latestDeploy = project.latestDeployment;
  const status = latestDeploy?.status || 'queued';
  const config = statusConfig[status] || statusConfig.queued;

  return (
    <motion.div
      className="project-card card"
      onClick={onSelect}
      whileHover={{ y: -2 }}
      layout
    >
      <div className="project-card-header">
        <div className="project-card-icon">
          <span>{frameworkIcons[project.framework] || '📦'}</span>
        </div>
        <div className="project-card-info">
          <h3 className="project-card-name">{project.name}</h3>
          <p className="project-card-repo">{project.repoFullName}</p>
        </div>
        <span className={`badge ${config.class}`}>
          <span className={`status-dot ${status}`} />
          {config.label}
        </span>
      </div>

      <div className="project-card-meta">
        <div className="meta-item">
          <GitBranch size={13} />
          <span>{project.branch}</span>
        </div>
        {latestDeploy && (
          <div className="meta-item">
            <Clock size={13} />
            <span>{timeAgo(latestDeploy.createdAt)}</span>
          </div>
        )}
        {latestDeploy?.deployUrl && (
          <a
            className="meta-item meta-link"
            href={latestDeploy.deployUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={13} />
            <span>Visit</span>
          </a>
        )}
      </div>

      <div className="project-card-footer">
        <span className="project-card-version mono">
          {latestDeploy ? `v${latestDeploy.version}` : 'No deploys'}
        </span>
        <div className="project-card-actions">
          <button
            className="btn btn-primary btn-sm"
            onClick={(e) => { e.stopPropagation(); onDeploy(); }}
            id={`deploy-btn-${project._id}`}
          >
            <Rocket size={14} />
            Deploy
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onSelect}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </motion.div>
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

  const handleDeploy = async (projectId: string) => {
    try {
      await triggerDeploy(projectId);
    } catch {
      // handled in hook
    }
  };

  const handleSelectProject = (project: Project) => {
    window.location.hash = `#/project/${project._id}`;
  };

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Projects</h1>
          <p className="dashboard-subtitle">Manage and deploy your applications</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowRepoSelector(true)}
          id="new-project-btn"
        >
          <Plus size={18} />
          New Project
        </button>
      </div>

      {/* Search */}
      <div className="dashboard-search">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          className="input search-input"
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          id="search-projects"
        />
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="projects-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton project-skeleton" />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="empty-state">
          <Folder size={48} strokeWidth={1} />
          <h3>No projects yet</h3>
          <p>Connect a GitHub repository to get started.</p>
          <button className="btn btn-primary" onClick={() => setShowRepoSelector(true)}>
            <Plus size={18} />
            Add Your First Project
          </button>
        </div>
      ) : (
        <motion.div className="projects-grid" layout>
          <AnimatePresence>
            {filteredProjects.map((project, i) => (
              <motion.div
                key={project._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
              >
                <ProjectCard
                  project={project}
                  onSelect={() => handleSelectProject(project)}
                  onDeploy={() => handleDeploy(project._id)}
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
