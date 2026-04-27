import { useEffect, useState, useRef } from 'react';

import { Cpu, Box, Globe, Play, Square, ExternalLink, RefreshCw } from 'lucide-react';
import { useDeployment } from '../hooks/useDeployment';
import { useProjects } from '../hooks/useProjects';
import '../styles/project-detail.css';

// SVG wire component for connecting nodes
const Wire = ({ id, start, end, status }: { id: string, start: {x:number, y:number}, end: {x:number, y:number}, status: 'idle'|'active'|'done' }) => {
  const dx = Math.abs(end.x - start.x) * 0.5;
  const path = `M ${start.x} ${start.y} C ${start.x + dx} ${start.y}, ${end.x - dx} ${end.y}, ${end.x} ${end.y}`;
  return (
    <svg className="canvas-wires" width="100%" height="100%">
      <path d={path} className={`wire-path ${status}`} id={`wire-${id}`} />
      {status === 'active' && (
        <circle r="4" className="wire-dot">
          <animateMotion dur="2s" repeatCount="indefinite" path={path} />
        </circle>
      )}
    </svg>
  );
};

export default function ProjectDetail({ projectId }: { projectId: string }) {
  const { projects } = useProjects();
  const { deploymentLogs, triggerDeploy, stopDeployment } = useDeployment();
  const [deploymentStatus, setDeploymentStatus] = useState<'idle'|'building'|'live'|'failed'>('idle');
  const [aiLogs, setAiLogs] = useState<string[]>(['Waiting for deployment to start...']);
  
  const project = projects.find(p => p._id === projectId);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal logs
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [deploymentLogs]);

  // Determine stage based on logs
  let stage = 0; // 0: git, 1: AI, 2: build, 3: live
  if (deploymentStatus === 'building') {
    if (deploymentLogs.some((l: any) => l.message.includes('FROM node'))) stage = 2;
    else if (deploymentLogs.some((l: any) => l.message.includes('Cloned'))) stage = 1;
    else stage = 0;
  } else if (deploymentStatus === 'live') {
    stage = 3;
  }

  // Simulate AI scanning when reaching stage 1
  useEffect(() => {
    if (stage === 1 && aiLogs.length === 1) {
      setAiLogs(['Analyzing repository structure...', 'Detected React + Vite framework.', 'Optimizing Dockerfile...', 'Scan complete! Passing to builder.']);
    }
  }, [stage, aiLogs]);

  const handleDeploy = async () => {
    if (!project) return;
    setDeploymentStatus('building');
    setAiLogs(['Waiting for code fetch...']);
    try {
      await triggerDeploy(project._id);
      setDeploymentStatus('live');
    } catch {
      setDeploymentStatus('failed');
    }
  };

  if (!project) return <div className="p-8 text-white">Loading node architecture...</div>;

  return (
    <div className="canvas-page">
      <div className="canvas-bg-pattern" />

      <div className="canvas-viewport">
        {/* Wires */}
        <Wire id="w1" start={{x: 370, y: 360}} end={{x: 450, y: 210}} status={stage > 0 ? (stage > 1 ? 'done' : 'active') : 'idle'} />
        <Wire id="w2" start={{x: 770, y: 210}} end={{x: 450, y: 510}} status={stage > 1 ? (stage > 2 ? 'done' : 'active') : 'idle'} />
        <Wire id="w3" start={{x: 770, y: 510}} end={{x: 850, y: 360}} status={stage > 2 ? 'done' : 'idle'} />

        {/* Node 1: GitHub */}
        <div className={`wf-node node-git ${stage >= 0 ? (stage > 0 ? 'done' : 'active') : ''}`}>
          <div className="wf-node-header">
            <div className="wf-node-icon">📦</div>
            <div className="wf-node-title">Source Node</div>
            <div className="wf-node-status">{stage > 0 ? 'FETCHED' : 'READY'}</div>
          </div>
          <div className="wf-node-body">
            <div className="text-sm text-gray-400 font-mono mb-2">{project.repoFullName}</div>
            <div className="wf-terminal">
              {stage > 0 ? <div className="wf-terminal-line success-text">&gt; Successfully cloned repository.</div> : <div className="wf-terminal-line">&gt; Waiting for trigger...</div>}
            </div>
          </div>
          <div className="port right" />
        </div>

        {/* Node 2: AI Scanner */}
        <div className={`wf-node node-ai ${stage >= 1 ? (stage > 1 ? 'done' : 'active') : ''}`}>
          <div className="port left" />
          <div className="wf-node-header">
            <div className="wf-node-icon"><Cpu size={14} /></div>
            <div className="wf-node-title">AI Engine</div>
            <div className="wf-node-status">{stage > 1 ? 'SCANNED' : (stage === 1 ? 'SCANNING' : 'IDLE')}</div>
          </div>
          <div className="wf-node-body">
            <div className="wf-terminal">
              {aiLogs.map((log, i) => <div key={i} className={`wf-terminal-line ${stage > 1 ? 'success-text' : 'active-text'}`}>&gt; {log}</div>)}
            </div>
          </div>
          <div className="port right" />
        </div>

        {/* Node 3: Docker Build */}
        <div className={`wf-node node-build ${stage >= 2 ? (stage > 2 ? 'done' : 'active') : ''}`}>
          <div className="port left" />
          <div className="wf-node-header">
            <div className="wf-node-icon"><Box size={14} /></div>
            <div className="wf-node-title">Builder</div>
            <div className="wf-node-status">{stage > 2 ? 'BUILT' : (stage === 2 ? 'BUILDING' : 'IDLE')}</div>
          </div>
          <div className="wf-node-body">
            <div className="wf-terminal" ref={terminalRef}>
              {deploymentLogs.length === 0 && <div className="wf-terminal-line">&gt; Waiting for instructions...</div>}
              {deploymentLogs.map((log: any, i: number) => (
                <div key={i} className={`wf-terminal-line ${log.level === 'error' ? 'text-red-500' : ''}`}>
                  {log.message}
                </div>
              ))}
            </div>
          </div>
          <div className="port right" />
        </div>

        {/* Node 4: Live Proxy */}
        <div className={`wf-node node-run ${stage === 3 ? 'done active' : ''}`}>
          <div className="port left" />
          <div className="wf-node-header">
            <div className="wf-node-icon"><Globe size={14} /></div>
            <div className="wf-node-title">Live Node</div>
            <div className="wf-node-status">{stage === 3 ? 'ONLINE' : 'OFFLINE'}</div>
          </div>
          <div className="wf-node-body">
            <div className="text-sm text-gray-400 mb-4 text-center mt-4">
              {stage === 3 ? 'Traffic is flowing smoothly.' : 'Waiting for container...'}
            </div>
            {stage === 3 && project.latestDeployment?.deployUrl && (
              <a href={project.latestDeployment.deployUrl} target="_blank" rel="noreferrer" className="btn btn-primary w-full glow">
                <ExternalLink size={16} /> Open App
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="canvas-controls">
        <button 
          className="btn btn-primary btn-lg glow" 
          onClick={handleDeploy}
          disabled={deploymentStatus === 'building'}
        >
          {deploymentStatus === 'building' ? <RefreshCw className="animate-spin" size={18} /> : <Play size={18} fill="currentColor" />}
          {deploymentStatus === 'building' ? 'Deploying...' : 'Trigger Pipeline'}
        </button>
        <button className="btn btn-danger btn-lg" onClick={() => project.latestDeployment && stopDeployment(project.latestDeployment._id)}>
          <Square size={18} fill="currentColor" /> Stop
        </button>
      </div>
    </div>
  );
}
