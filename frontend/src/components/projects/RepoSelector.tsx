import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Search, GitBranch, Star, Lock, Globe, Loader2, ArrowRight } from 'lucide-react';
import { useProjects } from '../../hooks/useProjects';
import type { GithubRepo } from '../../store/appStore';

interface RepoSelectorProps {
  onClose: () => void;
}

export default function RepoSelector({ onClose }: RepoSelectorProps) {
  const { githubRepos, fetchGithubRepos, createProject } = useProjects();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<GithubRepo | null>(null);
  const [projectName, setProjectName] = useState('');
  const [rootDir, setRootDir] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    const load = async () => {
      await fetchGithubRepos();
      setLoading(false);
    };
    load();
  }, [fetchGithubRepos]);

  const filtered = githubRepos.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleImport = async () => {
    if (!selectedRepo) return;
    setCreating(true);
    try {
      const name = projectName.trim() || selectedRepo.name;
      const root = rootDir.trim() || '.';
      await createProject(selectedRepo.html_url, name, selectedRepo.default_branch, root);
      onClose();
    } catch {
      // handled
    }
    setCreating(false);
  };

  const langColors: Record<string, string> = {
    TypeScript: '#3178c6',
    JavaScript: '#f7df1e',
    Python: '#3572A5',
    Rust: '#dea584',
    Go: '#00ADD8',
    Java: '#b07219',
    'C++': '#f34b7d',
    HTML: '#e34c26',
    CSS: '#563d7c',
    null: '#8b8b9e',
  };

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal-content repo-selector-modal"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Import Repository</h2>
          <button className="btn btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {!selectedRepo ? (
          <>
            <div className="modal-search">
              <Search size={16} />
              <input
                className="input"
                placeholder="Search repositories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>

            <div className="repo-list">
              {loading ? (
                <div className="repo-loading">
                  <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent-cyan)' }} />
                  <span>Fetching your repositories...</span>
                </div>
              ) : filtered.length === 0 ? (
                <div className="repo-empty">No repositories found.</div>
              ) : (
                filtered.map((repo) => (
                  <button
                    key={repo.id}
                    className="repo-item"
                    onClick={() => {
                      setSelectedRepo(repo);
                      setProjectName(repo.name);
                    }}
                  >
                    <div className="repo-item-left">
                      {repo.private ? <Lock size={14} /> : <Globe size={14} />}
                      <div>
                        <span className="repo-item-name">{repo.name}</span>
                        <span className="repo-item-desc">{repo.description || 'No description'}</span>
                      </div>
                    </div>
                    <div className="repo-item-right">
                      {repo.language && (
                        <span className="repo-lang">
                          <span className="lang-dot" style={{ background: langColors[repo.language] || '#8b8b9e' }} />
                          {repo.language}
                        </span>
                      )}
                      {repo.stargazers_count > 0 && (
                        <span className="repo-stars">
                          <Star size={12} /> {repo.stargazers_count}
                        </span>
                      )}
                      <ArrowRight size={14} className="repo-arrow" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="repo-config">
            <div className="selected-repo-card card">
              <div className="repo-item-left">
                {selectedRepo.private ? <Lock size={16} /> : <Globe size={16} />}
                <div>
                  <span className="repo-item-name">{selectedRepo.full_name}</span>
                  <span className="repo-item-desc">{selectedRepo.description || 'No description'}</span>
                </div>
              </div>
            </div>

            <div className="config-form">
              <div className="form-group">
                <label>Project Name</label>
                <input
                  className="input"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="my-awesome-app"
                />
              </div>
              <div className="form-group">
                <label>Branch</label>
                <div className="branch-display">
                  <GitBranch size={14} />
                  <span className="mono">{selectedRepo.default_branch}</span>
                </div>
              </div>

              <div className="form-group">
                <button 
                  type="button" 
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', marginTop: '10px' }}
                >
                  {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
                </button>
              </div>

              {showAdvanced && (
                <div className="form-group" style={{ marginTop: '10px' }}>
                  <label>Root Directory</label>
                  <input
                    className="input"
                    value={rootDir}
                    onChange={(e) => setRootDir(e.target.value)}
                    placeholder="e.g., frontend or backend (default: .)"
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                    If your project is a monorepo, specify the sub-directory here.
                  </small>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setSelectedRepo(null)}>
                Back
              </button>
              <button
                className="btn btn-primary"
                onClick={handleImport}
                disabled={creating}
              >
                {creating ? <Loader2 size={16} className="animate-spin" /> : null}
                {creating ? 'Importing...' : 'Import & Deploy'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
