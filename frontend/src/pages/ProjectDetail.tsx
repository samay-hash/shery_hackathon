import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Rocket, Clock, GitBranch, ExternalLink, RotateCcw,
  Eye, EyeOff, Plus, Trash2, CheckCircle2, XCircle, Loader2,
  AlertCircle, FileCode, Box, Server, Globe, Upload
} from 'lucide-react';
import { useProjects } from '../hooks/useProjects';
import { useDeployment } from '../hooks/useDeployment';
import { useSocket } from '../hooks/useSocket';
import type { Deployment, DeployStatus } from '../store/appStore';
import '../styles/project-detail.css';

/* ── Pipeline Node Definitions ─────────────────────────── */
const PIPELINE = [
  { id: 'fetch', label: 'Git Fetch', icon: GitBranch },
  { id: 'env',   label: 'Env Setup', icon: FileCode },
  { id: 'build', label: 'Docker Build', icon: Box },
  { id: 'run',   label: 'Container Run', icon: Server },
  { id: 'live',  label: 'Live Proxy', icon: Globe },
] as const;

/* ── Helpers ───────────────────────────────────────────── */
function StatusBadge({ status }: { status: DeployStatus }) {
  switch (status) {
    case 'live':     return <CheckCircle2 size={16} className="text-success" />;
    case 'failed':   return <XCircle size={16} className="text-error" />;
    case 'building':
    case 'deploying':
    case 'queued':
      return <Loader2 size={16} className="text-building animate-spin" />;
    default:         return <AlertCircle size={16} className="text-muted" />;
  }
}

function timeAgo(d: string): string {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ── Main Component ────────────────────────────────────── */
export default function ProjectDetail({ projectId }: { projectId: string }) {

  /* ---- ALL hooks at the very top, before any return ---- */
  const { selectedProject, fetchProject, updateEnvVars, editProject } = useProjects();
  const { triggerDeploy, fetchDeployments, deployments, deploymentLogs, activeDeployment, rollback } = useDeployment();
  const { connect, joinDeploymentRoom } = useSocket();

  const [selectedNode, setSelectedNode] = useState('fetch');
  const [envPairs, setEnvPairs] = useState<{ key: string; value: string; visible: boolean }[]>([]);
  const [deploying, setDeploying] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    buildCommand: '', startCommand: '', outputDir: '', rootDir: '', branch: ''
  });

  const logEndRef = useRef<HTMLDivElement>(null);

  /* ---- Effects ---- */
  useEffect(() => {
    fetchProject(projectId);
    fetchDeployments(projectId);
    connect();
  }, [projectId, fetchProject, fetchDeployments, connect]);

  useEffect(() => {
    if (selectedProject) {
      if (selectedProject.envVars) {
        setEnvPairs(Object.entries(selectedProject.envVars).map(([key, value]) => ({ key, value, visible: false })));
      }
      setSettingsForm({
        buildCommand: selectedProject.buildCommand || '',
        startCommand: selectedProject.startCommand || '',
        outputDir: selectedProject.outputDir || '',
        rootDir: selectedProject.rootDir || '.',
        branch: selectedProject.branch || 'main',
      });
    }
  }, [selectedProject]);

  useEffect(() => {
    if (activeDeployment) joinDeploymentRoom(activeDeployment._id);
  }, [activeDeployment, joinDeploymentRoom]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [deploymentLogs]);

  /* ---- Compute pipeline state ---- */
  let pipeIdx = -1;
  let isErr = false;

  if (activeDeployment) {
    const logs = deploymentLogs.map(l => l.message).join(' ');
    if (activeDeployment.status === 'failed') {
      isErr = true;
      pipeIdx = 2;
      if (logs.includes('Clone failed')) pipeIdx = 0;
      else if (logs.includes('Starting container')) pipeIdx = 3;
    } else if (activeDeployment.status === 'queued') {
      pipeIdx = 0;
    } else if (activeDeployment.status === 'building') {
      if (logs.includes('Building Docker image')) pipeIdx = 2;
      else if (logs.includes('Detected framework')) pipeIdx = 1;
      else pipeIdx = 0;
    } else if (activeDeployment.status === 'deploying') {
      pipeIdx = 3;
    } else if (activeDeployment.status === 'live') {
      pipeIdx = 5; // all done
    }
  }

  // Auto-focus the active node during deployment
  useEffect(() => {
    if (!activeDeployment) return;
    if (['queued', 'building', 'deploying'].includes(activeDeployment.status)) {
      const node = PIPELINE[Math.max(0, pipeIdx)];
      if (node) setSelectedNode(node.id);
    } else if (activeDeployment.status === 'live') {
      setSelectedNode('live');
    }
  }, [pipeIdx, activeDeployment?.status]);

  /* ---- Handlers ---- */
  const handleDeploy = async () => {
    setDeploying(true);
    try { await triggerDeploy(projectId); } catch { /* handled */ }
    setDeploying(false);
  };

  const handleSaveEnv = async () => {
    const vars: Record<string, string> = {};
    envPairs.forEach(({ key, value }) => { if (key.trim()) vars[key.trim()] = value; });
    await updateEnvVars(projectId, vars);
  };

  const handleSaveSettings = async () => {
    try { await editProject(projectId, settingsForm); } catch (e) { console.error(e); }
  };

  const handleEnvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const parsed: typeof envPairs = [];
      text.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) return;
        parsed.push({ key: trimmed.slice(0, eqIdx).trim(), value: trimmed.slice(eqIdx + 1).trim(), visible: false });
      });
      setEnvPairs(prev => [...prev, ...parsed]);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  /* ---- Loading State ---- */
  if (!selectedProject) {
    return (
      <div className="project-detail-loading">
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent-cyan)' }} />
      </div>
    );
  }

  /* ──────────────────────── RENDER ──────────────────────── */
  return (
    <div className="project-detail-page">

      {/* ─── Top Bar ─── */}
      <div className="project-top-bar">
        <button className="btn btn-ghost" onClick={() => (window.location.hash = '#/dashboard')}>
          <ArrowLeft size={18} /> Back
        </button>
        <div className="project-top-info">
          <h1 className="project-detail-name">{selectedProject.name}</h1>
          <span className="project-detail-repo mono">{selectedProject.repoFullName}</span>
        </div>
        <button
          className={`btn btn-primary ${deploying ? 'btn-loading' : ''}`}
          onClick={handleDeploy}
          disabled={deploying}
        >
          {deploying ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
          {deploying ? 'Deploying…' : 'Deploy Now'}
        </button>
      </div>

      {/* ─── Pipeline Node Graph ─── */}
      <div className="pipeline-wrapper">
        <div className="node-graph">
          {PIPELINE.map((node, i) => {
            const Icon = node.icon;
            let state = 'pending';
            if (activeDeployment) {
              if (i < pipeIdx) state = 'done';
              else if (i === pipeIdx) state = isErr ? 'error' : 'active';
            }
            const edgeState = activeDeployment
              ? (i < pipeIdx ? 'done' : i === pipeIdx && !isErr ? 'active' : 'pending')
              : 'pending';
            const sel = selectedNode === node.id;

            return (
              <div key={node.id} style={{ display: 'flex', alignItems: 'center' }}>
                <div
                  className={`graph-node ${state} ${sel ? 'selected' : ''}`}
                  onClick={() => setSelectedNode(node.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="node-box">
                    <Icon size={22} />
                  </div>
                  <span className="node-label">{node.label}</span>
                </div>
                {i < PIPELINE.length - 1 && <div className={`graph-edge ${edgeState}`} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Canvas Area (changes based on selected node) ─── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedNode}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.18 }}
          className="canvas-workspace"
        >

          {/* ▸ GIT FETCH */}
          {selectedNode === 'fetch' && (
            <div className="card" style={{ maxWidth: 600 }}>
              <div className="card-header-row">
                <div className="icon-circle bg-cyan"><GitBranch size={20} /></div>
                <h3 className="card-section-title">Repository Source</h3>
              </div>
              <div className="info-grid" style={{ marginBottom: 24 }}>
                <div className="info-item full-width">
                  <span className="info-label">GitHub Repo</span>
                  <span className="info-value mono">{selectedProject.repoUrl}</span>
                </div>
              </div>
              <div className="settings-form">
                <div className="form-group">
                  <label>Branch</label>
                  <input className="input" value={settingsForm.branch} onChange={e => setSettingsForm(p => ({ ...p, branch: e.target.value }))} placeholder="main" />
                </div>
                <div className="form-group">
                  <label>Root Directory</label>
                  <input className="input" value={settingsForm.rootDir} onChange={e => setSettingsForm(p => ({ ...p, rootDir: e.target.value }))} placeholder="./" />
                  <span className="hint">Leave as "./" unless project is in a sub-folder (monorepo).</span>
                </div>
              </div>
              <button className="btn btn-primary" onClick={handleSaveSettings} style={{ marginTop: 20 }}>Save Settings</button>
            </div>
          )}

          {/* ▸ ENV SETUP */}
          {selectedNode === 'env' && (
            <div className="card" style={{ maxWidth: 800 }}>
              <div className="card-header-row" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="icon-circle bg-cyan"><FileCode size={20} /></div>
                  <h3 className="card-section-title">Environment Variables</h3>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                    <Upload size={14} /> Upload .env
                    <input type="file" accept=".env,.env.local,.env.production,.txt" style={{ display: 'none' }} onChange={handleEnvFileUpload} />
                  </label>
                  <button className="btn btn-secondary btn-sm" onClick={() => setEnvPairs(p => [...p, { key: '', value: '', visible: false }])}>
                    <Plus size={14} /> Add
                  </button>
                </div>
              </div>

              <div className="env-list">
                {envPairs.length === 0 ? (
                  <div className="empty-state" style={{ padding: '40px 0' }}>
                    <FileCode size={28} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                    <p>No variables yet. Upload a <strong>.env</strong> file or add manually.</p>
                  </div>
                ) : (
                  envPairs.map((pair, i) => (
                    <div key={i} className="env-row">
                      <input className="input env-key" placeholder="KEY" value={pair.key}
                        onChange={e => { const u = [...envPairs]; u[i].key = e.target.value; setEnvPairs(u); }} />
                      <div className="env-value-wrapper">
                        <input className="input env-value" type={pair.visible ? 'text' : 'password'} placeholder="value" value={pair.value}
                          onChange={e => { const u = [...envPairs]; u[i].value = e.target.value; setEnvPairs(u); }} />
                        <button className="btn btn-icon env-toggle" onClick={() => { const u = [...envPairs]; u[i].visible = !u[i].visible; setEnvPairs(u); }}>
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
              {envPairs.length > 0 && (
                <button className="btn btn-primary" onClick={handleSaveEnv} style={{ marginTop: 20 }}>Save Environment Variables</button>
              )}
            </div>
          )}

          {/* ▸ DOCKER BUILD — config + live logs */}
          {selectedNode === 'build' && (
            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
              <div className="card">
                <div className="card-header-row">
                  <div className="icon-circle bg-cyan"><Box size={20} /></div>
                  <h3 className="card-section-title">Build Config</h3>
                </div>
                <div className="settings-form">
                  <div className="form-group">
                    <label>Framework</label>
                    <input className="input" value={selectedProject.framework} disabled />
                  </div>
                  <div className="form-group">
                    <label>Build Command</label>
                    <input className="input" value={settingsForm.buildCommand} onChange={e => setSettingsForm(p => ({ ...p, buildCommand: e.target.value }))} placeholder="auto" />
                  </div>
                  <div className="form-group">
                    <label>Output Dir</label>
                    <input className="input" value={settingsForm.outputDir} onChange={e => setSettingsForm(p => ({ ...p, outputDir: e.target.value }))} placeholder="auto" />
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={handleSaveSettings} style={{ marginTop: 8 }}>Save</button>
                </div>
              </div>

              <div className="terminal-container live-border">
                <div className="terminal">
                  <div className="terminal-header">
                    <div className="terminal-dot red" /><div className="terminal-dot yellow" /><div className="terminal-dot green" />
                    <span className="terminal-title">Build Logs</span>
                  </div>
                  <div className="terminal-body" style={{ minHeight: 320 }}>
                    {deploymentLogs.length === 0 ? (
                      <div className="terminal-line info"><span className="content">Waiting for deployment…</span></div>
                    ) : deploymentLogs.map((log, i) => (
                      <div key={i} className={`terminal-line ${log.level}`}>
                        <span className="timestamp">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        <span className="content">{log.message}</span>
                      </div>
                    ))}
                    <div ref={logEndRef} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ▸ CONTAINER RUN — deployment history */}
          {selectedNode === 'run' && (
            <div className="card" style={{ maxWidth: 800, margin: '0 auto' }}>
              <div className="card-header-row">
                <div className="icon-circle bg-cyan"><Server size={20} /></div>
                <h3 className="card-section-title">Deployment History</h3>
              </div>
              <div className="deployments-list">
                {deployments.length === 0 ? (
                  <div className="empty-state" style={{ padding: '40px 0' }}>
                    <Clock size={28} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                    <p>No deployments yet. Hit <strong>Deploy Now</strong> to start.</p>
                  </div>
                ) : deployments.map((dep: Deployment) => (
                  <motion.div key={dep._id} className="deployment-row card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="deploy-row-left">
                      <StatusBadge status={dep.status} />
                      <div>
                        <div className="deploy-row-title">
                          <span className="mono deploy-version">v{dep.version}</span>
                          <span className={`badge badge-${dep.status === 'live' ? 'live' : dep.status === 'failed' ? 'failed' : 'building'}`}>{dep.status}</span>
                        </div>
                        <p className="deploy-row-commit mono">{dep.commitHash?.slice(0, 7)} — {dep.commitMessage || 'No message'}</p>
                      </div>
                    </div>
                    <div className="deploy-row-right">
                      <span className="deploy-row-time">{timeAgo(dep.createdAt)}</span>
                      {dep.status === 'live' && dep.deployUrl && (
                        <a href={dep.deployUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm"><ExternalLink size={14} /></a>
                      )}
                      {dep.status !== 'live' && dep.status !== 'building' && (
                        <button className="btn btn-ghost btn-sm" onClick={() => rollback(dep._id)}><RotateCcw size={14} /> Rollback</button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* ▸ LIVE PROXY — success screen */}
          {selectedNode === 'live' && (
            <div className="card" style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', padding: '60px 30px' }}>
              <div className="icon-circle bg-cyan" style={{ width: 80, height: 80, margin: '0 auto 24px', boxShadow: '0 0 40px rgba(0,229,255,0.35)' }}>
                <Globe size={40} />
              </div>
              <h2 style={{ fontSize: '1.8rem', marginBottom: 10 }}>
                {selectedProject.latestDeployment?.status === 'live' ? 'Your Project is Live! 🚀' : 'Waiting for Live Status…'}
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 28, maxWidth: 420, margin: '0 auto 28px' }}>
                Traffic is routed through the reverse proxy to your isolated Docker container.
              </p>
              {selectedProject.latestDeployment?.deployUrl ? (
                <a href={selectedProject.latestDeployment.deployUrl} target="_blank" rel="noopener noreferrer"
                  className="btn btn-primary" style={{ fontSize: '1rem', padding: '14px 28px' }}>
                  <ExternalLink size={18} /> Visit Live Site
                </a>
              ) : (
                <span className="badge badge-building">Deploying…</span>
              )}
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
