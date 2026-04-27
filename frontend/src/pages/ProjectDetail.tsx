import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Rocket, Clock, GitBranch, ExternalLink, RotateCcw, Settings, Key, Eye, EyeOff, Plus, Trash2, CheckCircle2, XCircle, Loader2, AlertCircle, FileCode, Box, Server, Globe } from 'lucide-react';
import { useProjects } from '../hooks/useProjects';
import { useDeployment } from '../hooks/useDeployment';
import { useSocket } from '../hooks/useSocket';
import type { Deployment, DeployStatus } from '../store/appStore';
import '../styles/project-detail.css';

const pipelineNodes = [
  { id: 'fetch', label: 'Git Fetch', icon: GitBranch },
  { id: 'env', label: 'Env Setup', icon: FileCode },
  { id: 'build', label: 'Docker Build', icon: Box },
  { id: 'run', label: 'Deploy Run', icon: Server },
  { id: 'live', label: 'Live Proxy', icon: Globe },
];

function StatusIcon({ status }: { status: DeployStatus }) {
  switch (status) {
    case 'live': return <CheckCircle2 size={16} className="text-success" />;
    case 'failed': return <XCircle size={16} className="text-error" />;
    case 'building':
    case 'deploying':
    case 'queued':
      return <Loader2 size={16} className="text-building animate-spin" />;
    default: return <AlertCircle size={16} className="text-muted" />;
  }
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function ProjectDetail({ projectId }: { projectId: string }) {
  const { selectedProject, fetchProject, updateEnvVars, editProject } = useProjects();
  const { triggerDeploy, fetchDeployments, deployments, deploymentLogs, activeDeployment, rollback } = useDeployment();
  const { connect, joinDeploymentRoom } = useSocket();
  const [activeTab, setActiveTab] = useState<'overview' | 'deployments' | 'env' | 'settings'>('overview');
  const [envPairs, setEnvPairs] = useState<{ key: string; value: string; visible: boolean }[]>([]);
  const [deploying, setDeploying] = useState(false);
  
  // Settings Form State
  const [settingsForm, setSettingsForm] = useState({
    buildCommand: '',
    startCommand: '',
    outputDir: '',
    rootDir: '',
    branch: ''
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProject(projectId);
    fetchDeployments(projectId);
    connect();
  }, [projectId, fetchProject, fetchDeployments, connect]);

  useEffect(() => {
    if (selectedProject) {
      if (selectedProject.envVars) {
        setEnvPairs(
          Object.entries(selectedProject.envVars).map(([key, value]) => ({ key, value, visible: false }))
        );
      }
      setSettingsForm({
        buildCommand: selectedProject.buildCommand || '',
        startCommand: selectedProject.startCommand || '',
        outputDir: selectedProject.outputDir || '',
        rootDir: selectedProject.rootDir || '.',
        branch: selectedProject.branch || 'main'
      });
    }
  }, [selectedProject]);

  useEffect(() => {
    if (activeDeployment) {
      joinDeploymentRoom(activeDeployment._id);
    }
  }, [activeDeployment, joinDeploymentRoom]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [deploymentLogs]);

  const handleDeploy = async () => {
    setDeploying(true);
    try {
      await triggerDeploy(projectId);
    } catch { /* handled */ }
    setDeploying(false);
  };

  const handleSaveEnv = async () => {
    const vars: Record<string, string> = {};
    envPairs.forEach(({ key, value }) => { if (key.trim()) vars[key.trim()] = value; });
    await updateEnvVars(projectId, vars);
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await editProject(projectId, settingsForm);
    } catch (err) {
      console.error(err);
    }
    setSavingSettings(false);
  };

  const handleRollback = async (deploymentId: string) => {
    await rollback(deploymentId);
  };

  if (!selectedProject) {
    return (
      <div className="project-detail-loading">
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent-cyan)' }} />
      </div>
    );
  }

  let currentPipelineIdx = -1;
  let isError = false;
  
  if (activeDeployment) {
    if (activeDeployment.status === 'failed') {
      isError = true;
      currentPipelineIdx = 2; // Default fallback to build node
      const logsStr = deploymentLogs.map(l => l.message).join(' ');
      if (logsStr.includes('Clone failed')) currentPipelineIdx = 0;
      else if (logsStr.includes('Starting container')) currentPipelineIdx = 3;
    } else {
      if (activeDeployment.status === 'queued') currentPipelineIdx = 0;
      else if (activeDeployment.status === 'building') {
        const logsStr = deploymentLogs.map(l => l.message).join(' ');
        if (logsStr.includes('Building Docker image')) currentPipelineIdx = 2;
        else if (logsStr.includes('Detected framework')) currentPipelineIdx = 1;
        else currentPipelineIdx = 0;
      }
      else if (activeDeployment.status === 'deploying') currentPipelineIdx = 3;
      else if (activeDeployment.status === 'live') currentPipelineIdx = 5;
    }
  }

  return (
    <div className="project-detail-page">
      {/* Top Bar */}
      <div className="project-top-bar">
        <button className="btn btn-ghost" onClick={() => window.location.hash = '#/dashboard'}>
          <ArrowLeft size={18} />
          Back
        </button>
        <div className="project-top-info">
          <h1 className="project-detail-name">{selectedProject.name}</h1>
          <span className="project-detail-repo mono">{selectedProject.repoFullName}</span>
        </div>
        <button
          className={`btn btn-primary ${deploying ? 'btn-loading' : ''}`}
          onClick={handleDeploy}
          disabled={deploying}
          id="project-deploy-btn"
        >
          {deploying ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
          {deploying ? 'Deploying...' : 'Deploy'}
        </button>
      </div>

      {/* Node Graph Pipeline */}
      {activeDeployment && (
        <motion.div className="pipeline-wrapper" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="node-graph">
            {pipelineNodes.map((node, i) => {
              const NodeIcon = node.icon;
              let stateClass = 'pending';
              if (i < currentPipelineIdx) stateClass = 'done';
              else if (i === currentPipelineIdx) stateClass = isError ? 'error' : 'active';

              const edgeClass = i < currentPipelineIdx ? 'done' : (i === currentPipelineIdx && !isError) ? 'active' : 'pending';

              return (
                <div key={node.id} style={{ display: 'flex', alignItems: 'center' }}>
                  <div className={`graph-node ${stateClass}`}>
                    <div className="node-box">
                      <NodeIcon size={22} />
                    </div>
                    <span className="node-label">{node.label}</span>
                  </div>
                  {i < pipelineNodes.length - 1 && (
                    <div className={`graph-edge ${edgeClass}`} />
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="project-tabs">
        {(['overview', 'deployments', 'env', 'settings'] as const).map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'overview' && <Rocket size={15} />}
            {tab === 'deployments' && <Clock size={15} />}
            {tab === 'env' && <Key size={15} />}
            {tab === 'settings' && <Settings size={15} />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="tab-content"
        >
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="overview-grid">
              <div className="overview-info card">
                <h3 className="card-section-title">Project Info</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Framework</span>
                    <span className="info-value">{selectedProject.framework}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Branch</span>
                    <span className="info-value mono"><GitBranch size={13} /> {selectedProject.branch}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Build Command</span>
                    <span className="info-value mono">{selectedProject.buildCommand || 'auto'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Auto Deploy</span>
                    <span className="info-value">{selectedProject.autoDeployEnabled ? '✅ Enabled' : '❌ Disabled'}</span>
                  </div>
                  {selectedProject.latestDeployment?.deployUrl && (
                    <div className="info-item full-width">
                      <span className="info-label">Live URL</span>
                      <a href={selectedProject.latestDeployment.deployUrl} target="_blank" rel="noopener noreferrer" className="info-value info-link">
                        <ExternalLink size={13} />
                        {selectedProject.latestDeployment.deployUrl}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Live Logs */}
              <div className="terminal-container live-border">
                <div className="terminal">
                  <div className="terminal-header">
                    <div className="terminal-dot red" />
                    <div className="terminal-dot yellow" />
                    <div className="terminal-dot green" />
                    <span className="terminal-title">Build Output</span>
                  </div>
                  <div className="terminal-body">
                    {deploymentLogs.length === 0 ? (
                      <div className="terminal-line info">
                        <span className="content">Waiting for deployment...</span>
                      </div>
                    ) : (
                      deploymentLogs.map((log, i) => (
                        <div key={i} className={`terminal-line ${log.level}`}>
                          <span className="timestamp">{new Date(log.timestamp).toLocaleTimeString()}</span>
                          <span className="content">{log.message}</span>
                        </div>
                      ))
                    )}
                    <div ref={logEndRef} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Deployments Tab */}
          {activeTab === 'deployments' && (
            <div className="deployments-list">
              {deployments.length === 0 ? (
                <div className="empty-state">
                  <Clock size={32} />
                  <h3>No deployments yet</h3>
                  <p>Click Deploy to create your first deployment.</p>
                </div>
              ) : (
                deployments.map((dep: Deployment) => (
                  <motion.div
                    key={dep._id}
                    className="deployment-row card"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div className="deploy-row-left">
                      <StatusIcon status={dep.status} />
                      <div>
                        <div className="deploy-row-title">
                          <span className="mono deploy-version">v{dep.version}</span>
                          <span className={`badge badge-${dep.status === 'live' ? 'live' : dep.status === 'failed' ? 'failed' : 'building'}`}>
                            {dep.status}
                          </span>
                        </div>
                        <p className="deploy-row-commit mono">{dep.commitHash?.slice(0, 7)} — {dep.commitMessage || 'No message'}</p>
                      </div>
                    </div>
                    <div className="deploy-row-right">
                      <span className="deploy-row-time">{timeAgo(dep.createdAt)}</span>
                      {dep.buildDuration > 0 && (
                        <span className="deploy-row-duration">{dep.buildDuration}s</span>
                      )}
                      {dep.status === 'live' && dep.deployUrl && (
                        <a href={dep.deployUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                          <ExternalLink size={14} />
                        </a>
                      )}
                      {dep.status !== 'live' && dep.status !== 'building' && (
                        <button className="btn btn-ghost btn-sm" onClick={() => handleRollback(dep._id)} title="Rollback to this version">
                          <RotateCcw size={14} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}

          {/* Environment Variables Tab */}
          {activeTab === 'env' && (
            <div className="env-section">
              <div className="env-header">
                <h3 className="card-section-title">Environment Variables</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => setEnvPairs([...envPairs, { key: '', value: '', visible: false }])}>
                  <Plus size={14} /> Add Variable
                </button>
              </div>
              <div className="env-list">
                {envPairs.map((pair, i) => (
                  <div key={i} className="env-row">
                    <input
                      className="input env-key"
                      placeholder="KEY_NAME"
                      value={pair.key}
                      onChange={(e) => {
                        const updated = [...envPairs];
                        updated[i].key = e.target.value;
                        setEnvPairs(updated);
                      }}
                    />
                    <div className="env-value-wrapper">
                      <input
                        className="input env-value"
                        type={pair.visible ? 'text' : 'password'}
                        placeholder="value"
                        value={pair.value}
                        onChange={(e) => {
                          const updated = [...envPairs];
                          updated[i].value = e.target.value;
                          setEnvPairs(updated);
                        }}
                      />
                      <button className="btn btn-icon env-toggle" onClick={() => {
                        const updated = [...envPairs];
                        updated[i].visible = !updated[i].visible;
                        setEnvPairs(updated);
                      }}>
                        {pair.visible ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <button className="btn btn-icon btn-danger" onClick={() => setEnvPairs(envPairs.filter((_, j) => j !== i))}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button className="btn btn-primary" onClick={handleSaveEnv} style={{ marginTop: 16 }}>
                Save Environment Variables
              </button>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="settings-section">
              <div className="card">
                <h3 className="card-section-title">Build Settings</h3>
                <div className="settings-form">
                  <div className="form-group">
                    <label>Root Directory</label>
                    <input className="input" value={settingsForm.rootDir} onChange={(e) => setSettingsForm({ ...settingsForm, rootDir: e.target.value })} placeholder="./ (e.g. frontend)" />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Leave as "./" unless your project is in a subfolder (e.g. monorepo).</span>
                  </div>
                  <div className="form-group">
                    <label>Build Command</label>
                    <input className="input" value={settingsForm.buildCommand} onChange={(e) => setSettingsForm({ ...settingsForm, buildCommand: e.target.value })} placeholder="npm run build (leave empty for auto)" />
                  </div>
                  <div className="form-group">
                    <label>Start Command</label>
                    <input className="input" value={settingsForm.startCommand} onChange={(e) => setSettingsForm({ ...settingsForm, startCommand: e.target.value })} placeholder="npm start (leave empty for auto)" />
                  </div>
                  <div className="form-group">
                    <label>Output Directory</label>
                    <input className="input" value={settingsForm.outputDir} onChange={(e) => setSettingsForm({ ...settingsForm, outputDir: e.target.value })} placeholder="dist or .next" />
                  </div>
                  <div className="form-group">
                    <label>Branch</label>
                    <input className="input" value={settingsForm.branch} onChange={(e) => setSettingsForm({ ...settingsForm, branch: e.target.value })} placeholder="main" />
                  </div>
                </div>
                <button 
                  className={`btn btn-primary ${savingSettings ? 'btn-loading' : ''}`} 
                  style={{ marginTop: 20 }} 
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                >
                  {savingSettings ? <Loader2 size={16} className="animate-spin" /> : null}
                  {savingSettings ? 'Saving...' : 'Save Settings'}
                </button>
              </div>

              <div className="card danger-zone">
                <h3 className="card-section-title" style={{ color: 'var(--status-failed)' }}>Danger Zone</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 16 }}>
                  Once you delete a project, there is no going back.
                </p>
                <button className="btn btn-danger">
                  <Trash2 size={14} /> Delete Project
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
