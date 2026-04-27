import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Rocket, Clock, GitBranch, ExternalLink, RotateCcw, Eye, EyeOff, Plus, Trash2, CheckCircle2, XCircle, Loader2, AlertCircle, FileCode, Box, Server, Globe } from 'lucide-react';
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
    try {
      await editProject(projectId, settingsForm);
    } catch (err) {
      console.error(err);
    }
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

  const [selectedNodeId, setSelectedNodeId] = useState<string>('fetch');

  useEffect(() => {
    if (activeDeployment) {
      if (['queued', 'building', 'deploying'].includes(activeDeployment.status)) {
        if (pipelineNodes[Math.max(0, currentPipelineIdx)]) {
          setSelectedNodeId(pipelineNodes[Math.max(0, currentPipelineIdx)].id);
        }
      } else if (activeDeployment.status === 'live') {
        setSelectedNodeId('live');
      }
    }
  }, [currentPipelineIdx, activeDeployment?.status]);

  const handleEnvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const newPairs = [...envPairs];
      text.split('\n').forEach(line => {
        const [key, ...val] = line.split('=');
        if (key && key.trim() && !key.startsWith('#')) {
          // Check if key already exists to avoid duplicates, but for simplicity we just append.
          newPairs.push({ key: key.trim(), value: val.join('=').trim(), visible: false });
        }
      });
      setEnvPairs(newPairs);
    };
    reader.readAsText(file);
    // clear input
    e.target.value = '';
  };

  return (
    <div className="project-detail-page canvas-layout">
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
          className={`btn btn-primary btn-lg ${deploying ? 'btn-loading' : ''}`}
          onClick={handleDeploy}
          disabled={deploying}
          style={{ boxShadow: '0 0 20px rgba(0, 229, 255, 0.4)' }}
        >
          {deploying ? <Loader2 size={18} className="animate-spin" /> : <Rocket size={18} />}
          {deploying ? 'Deploying...' : 'Deploy Now'}
        </button>
      </div>

      {/* Node Graph Pipeline Always Visible */}
      <div className="pipeline-wrapper">
        <div className="node-graph">
          {pipelineNodes.map((node, i) => {
            const NodeIcon = node.icon;
            let stateClass = 'pending';
            if (activeDeployment) {
              if (i < currentPipelineIdx) stateClass = 'done';
              else if (i === currentPipelineIdx) stateClass = isError ? 'error' : 'active';
            }

            const edgeClass = activeDeployment ? (i < currentPipelineIdx ? 'done' : (i === currentPipelineIdx && !isError) ? 'active' : 'pending') : 'pending';
            const isSelected = selectedNodeId === node.id;

            return (
              <div key={node.id} style={{ display: 'flex', alignItems: 'center' }}>
                <div 
                  className={`graph-node ${stateClass} ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedNodeId(node.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="node-box" style={isSelected ? { borderColor: 'var(--accent-cyan)', boxShadow: '0 0 10px rgba(0, 229, 255, 0.3)' } : {}}>
                    <NodeIcon size={22} />
                  </div>
                  <span className="node-label" style={isSelected ? { color: 'var(--accent-cyan)' } : {}}>{node.label}</span>
                </div>
                {i < pipelineNodes.length - 1 && (
                  <div className={`graph-edge ${edgeClass}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Canvas Workspace */}
      <div className="canvas-workspace">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedNodeId}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="canvas-panel"
          >
            {/* Git Fetch Canvas */}
            {selectedNodeId === 'fetch' && (
              <div className="canvas-grid">
                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div className="icon-circle bg-cyan"><GitBranch size={20} /></div>
                    <h3 className="card-section-title" style={{ margin: 0 }}>Repository Source</h3>
                  </div>
                  <div className="info-grid">
                    <div className="info-item full-width">
                      <span className="info-label">GitHub Repo</span>
                      <span className="info-value mono">{selectedProject.repoUrl}</span>
                    </div>
                  </div>
                  <div className="settings-form" style={{ marginTop: 24 }}>
                    <div className="form-group">
                      <label>Branch</label>
                      <input className="input" value={settingsForm.branch} onChange={(e) => setSettingsForm({ ...settingsForm, branch: e.target.value })} placeholder="main" />
                    </div>
                    <div className="form-group">
                      <label>Root Directory</label>
                      <input className="input" value={settingsForm.rootDir} onChange={(e) => setSettingsForm({ ...settingsForm, rootDir: e.target.value })} placeholder="./" />
                      <span className="text-muted" style={{ fontSize: '0.8rem' }}>Set if your project is in a subfolder.</span>
                    </div>
                  </div>
                  <button className="btn btn-primary" onClick={handleSaveSettings} style={{ marginTop: 20 }}>Save Repository Settings</button>
                </div>
              </div>
            )}

            {/* Env Setup Canvas */}
            {selectedNodeId === 'env' && (
              <div className="canvas-grid single-col">
                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="icon-circle bg-cyan"><FileCode size={20} /></div>
                      <h3 className="card-section-title" style={{ margin: 0 }}>Environment Variables</h3>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                        <FileCode size={14} /> Upload .env File
                        <input type="file" accept=".env" style={{ display: 'none' }} onChange={handleEnvFileUpload} />
                      </label>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEnvPairs([...envPairs, { key: '', value: '', visible: false }])}>
                        <Plus size={14} /> Add Variable
                      </button>
                    </div>
                  </div>
                  
                  <div className="env-list">
                    {envPairs.length === 0 ? (
                      <div className="empty-state" style={{ minHeight: '150px' }}>
                        <p>No environment variables added. Upload a .env file or add manually.</p>
                      </div>
                    ) : (
                      envPairs.map((pair, i) => (
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
                      ))
                    )}
                  </div>
                  <button className="btn btn-primary" onClick={handleSaveEnv} style={{ marginTop: 24 }}>
                    Save Environment Variables
                  </button>
                </div>
              </div>
            )}

            {/* Docker Build Canvas */}
            {selectedNodeId === 'build' && (
              <div className="canvas-grid" style={{ gridTemplateColumns: '300px 1fr' }}>
                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div className="icon-circle bg-cyan"><Box size={20} /></div>
                    <h3 className="card-section-title" style={{ margin: 0 }}>Build Config</h3>
                  </div>
                  <div className="settings-form">
                    <div className="form-group">
                      <label>Framework</label>
                      <input className="input" value={selectedProject.framework} disabled />
                    </div>
                    <div className="form-group">
                      <label>Build Command</label>
                      <input className="input" value={settingsForm.buildCommand} onChange={(e) => setSettingsForm({ ...settingsForm, buildCommand: e.target.value })} placeholder="Auto-detected" />
                    </div>
                    <div className="form-group">
                      <label>Output Directory</label>
                      <input className="input" value={settingsForm.outputDir} onChange={(e) => setSettingsForm({ ...settingsForm, outputDir: e.target.value })} placeholder="Auto-detected" />
                    </div>
                    <button className="btn btn-primary" onClick={handleSaveSettings} style={{ marginTop: 10 }}>Save Config</button>
                  </div>
                </div>
                
                {/* Live Logs */}
                <div className="terminal-container live-border" style={{ height: '100%' }}>
                  <div className="terminal" style={{ height: '100%' }}>
                    <div className="terminal-header">
                      <div className="terminal-dot red" />
                      <div className="terminal-dot yellow" />
                      <div className="terminal-dot green" />
                      <span className="terminal-title">Docker Build Logs</span>
                    </div>
                    <div className="terminal-body" style={{ minHeight: '300px', maxHeight: '500px' }}>
                      {deploymentLogs.length === 0 ? (
                        <div className="terminal-line info">
                          <span className="content">Waiting for deployment to start...</span>
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

            {/* Deploy Run Canvas */}
            {selectedNodeId === 'run' && (
              <div className="canvas-grid single-col">
                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div className="icon-circle bg-cyan"><Server size={20} /></div>
                    <h3 className="card-section-title" style={{ margin: 0 }}>Deployment History</h3>
                  </div>
                  <div className="deployments-list">
                    {deployments.length === 0 ? (
                      <div className="empty-state">
                        <Clock size={32} />
                        <h3>No deployments yet</h3>
                      </div>
                    ) : (
                      deployments.map((dep: Deployment) => (
                        <motion.div key={dep._id} className="deployment-row card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
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
                            {dep.status !== 'live' && dep.status !== 'building' && (
                              <button className="btn btn-ghost btn-sm" onClick={() => handleRollback(dep._id)} title="Rollback to this version">
                                <RotateCcw size={14} /> Rollback
                              </button>
                            )}
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Live Proxy Canvas */}
            {selectedNodeId === 'live' && (
              <div className="canvas-grid single-col">
                <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', textAlign: 'center' }}>
                  <div className="icon-circle bg-cyan" style={{ width: 80, height: 80, marginBottom: 24, boxShadow: '0 0 30px rgba(0, 229, 255, 0.4)' }}>
                    <Globe size={40} />
                  </div>
                  <h2 style={{ fontSize: '2rem', marginBottom: 12 }}>Your project is Live!</h2>
                  <p className="text-muted" style={{ marginBottom: 30, maxWidth: 500 }}>
                    Traffic is now being routed through the reverse proxy directly to your isolated Docker container.
                  </p>
                  {selectedProject.latestDeployment?.deployUrl ? (
                    <a 
                      href={selectedProject.latestDeployment.deployUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn btn-primary btn-lg"
                      style={{ fontSize: '1.2rem', padding: '16px 32px' }}
                    >
                      <ExternalLink size={20} />
                      Visit {selectedProject.latestDeployment.deployUrl.replace('http://', '')}
                    </a>
                  ) : (
                    <div className="badge badge-building">Deploying to get URL...</div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
