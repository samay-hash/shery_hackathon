import { useEffect, useState, useRef } from 'react';
import { Play, Square, ExternalLink, RefreshCw } from 'lucide-react';
import { useDeployment } from '../hooks/useDeployment';
import { useProjects } from '../hooks/useProjects';
import '../styles/project-detail.css';

const Wire = ({ id, start, end, status }: { id: string, start: {x:number, y:number}, end: {x:number, y:number}, status: 'idle'|'active'|'done' }) => {
  let path = '';
  if (start.x === end.x) {
    // Vertical line
    const dy = Math.abs(end.y - start.y) * 0.5;
    path = `M ${start.x} ${start.y} C ${start.x} ${start.y + dy}, ${end.x} ${end.y - dy}, ${end.x} ${end.y}`;
  } else {
    // Horizontal line
    const dx = Math.abs(end.x - start.x) * 0.5;
    path = `M ${start.x} ${start.y} C ${start.x + dx} ${start.y}, ${end.x - dx} ${end.y}, ${end.x} ${end.y}`;
  }
  return (
    <svg className="canvas-wires" width="100%" height="100%">
      <path d={path} className={`wire-path ${status}`} id={`wire-${id}`} />
      {status === 'active' && (
        <circle r="3" className="wire-dot">
          <animateMotion dur="2s" repeatCount="indefinite" path={path} />
        </circle>
      )}
    </svg>
  );
};

export default function ProjectDetail({ projectId }: { projectId: string }) {
  const { projects } = useProjects();
  const { deploymentLogs, triggerDeploy, stopDeployment, activeDeployment } = useDeployment();
  const [deploymentStatus, setDeploymentStatus] = useState<'idle'|'building'|'live'|'failed'>('idle');

  // Sync status from real socket events
  useEffect(() => {
    if (!activeDeployment) return;
    const s = (activeDeployment as any).status;
    if (s === 'live') setDeploymentStatus('live');
    else if (s === 'failed') setDeploymentStatus('failed');
    else if (s === 'building' || s === 'deploying') setDeploymentStatus('building');
  }, [activeDeployment]);
  
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => setIsDragging(false);
  
  const project = projects.find(p => p._id === projectId);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [deploymentLogs]);

  let stage = 0;
  if (deploymentStatus === 'building') {
    if (deploymentLogs.length > 0) stage = 1;
    if (deploymentLogs.some((l: any) => l.message.includes('Cloning') || l.message.includes('cloned'))) stage = 1;
    if (deploymentLogs.some((l: any) => l.message.includes('Detected framework'))) stage = 2;
    if (deploymentLogs.some((l: any) => l.message.includes('Generated optimal Dockerfile'))) stage = 3;
    if (deploymentLogs.some((l: any) => l.message.includes('tar-fs stream') || l.message.includes('Step 1/'))) stage = 4;
    if (deploymentLogs.some((l: any) => l.message.includes('npm install') || l.message.includes('npm ci'))) stage = 5;
    if (deploymentLogs.some((l: any) => l.message.includes('npm run build') || l.message.includes('exporting layers'))) stage = 6;
    if (deploymentLogs.some((l: any) => l.message.includes('Image built'))) stage = 7;
    if (deploymentLogs.some((l: any) => l.message.includes('Starting container'))) stage = 8;
    if (deploymentLogs.some((l: any) => l.message.includes('Container started'))) stage = 9;
    if (deploymentLogs.some((l: any) => l.message.includes('Deployment LIVE'))) stage = 10;
  } else if (deploymentStatus === 'live') {
    stage = 10;
  }

  const handleDeploy = async () => {
    if (!project) return;
    setDeploymentStatus('building');
    try {
      await triggerDeploy(project._id);
      // Status will be updated via real Socket.io events from backend worker
    } catch {
      setDeploymentStatus('failed');
    }
  };

  if (!project) return <div className="p-8 text-white">Loading pipeline...</div>;

  const nodes = [
    { id: 1, name: 'Fetch Source', pos: 'n1', pR: true },
    { id: 2, name: 'AI Scanner', pos: 'n2', pL: true, pR: true },
    { id: 3, name: 'Docker Config', pos: 'n3', pL: true, pR: true },
    { id: 4, name: 'Engine Init', pos: 'n4', pL: true, pR: true },
    { id: 5, name: 'Deps Install', pos: 'n5', pL: true, pB: true },
    { id: 6, name: 'Artifact Build', pos: 'n6', pR: true, pT: true },
    { id: 7, name: 'Image Export', pos: 'n7', pL: true, pR: true },
    { id: 8, name: 'Provisioning', pos: 'n8', pL: true, pR: true },
    { id: 9, name: 'Proxy Route', pos: 'n9', pL: true, pR: true },
    { id: 10, name: 'Live', pos: 'n10', pL: true },
  ];

  return (
    <div 
      className="canvas-page" 
      onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      <div className="canvas-bg-pattern" style={{ transform: `translate(${position.x}px, ${position.y}px)` }} />
      <div className="canvas-viewport" style={{ transform: `translate(${position.x}px, ${position.y}px)` }}>
        
        {/* Horizontal Wires Row 1 */}
        <Wire id="w1" start={{x:290, y:190}} end={{x:340, y:190}} status={stage > 1 ? 'done' : stage === 1 ? 'active' : 'idle'} />
        <Wire id="w2" start={{x:580, y:190}} end={{x:630, y:190}} status={stage > 2 ? 'done' : stage === 2 ? 'active' : 'idle'} />
        <Wire id="w3" start={{x:870, y:190}} end={{x:920, y:190}} status={stage > 3 ? 'done' : stage === 3 ? 'active' : 'idle'} />
        <Wire id="w4" start={{x:1160, y:190}} end={{x:1210, y:190}} status={stage > 4 ? 'done' : stage === 4 ? 'active' : 'idle'} />
        
        {/* Vertical Wire */}
        <Wire id="w5" start={{x:1330, y:280}} end={{x:1330, y:380}} status={stage > 5 ? 'done' : stage === 5 ? 'active' : 'idle'} />
        
        {/* Horizontal Wires Row 2 (Right to Left) */}
        <Wire id="w6" start={{x:1210, y:470}} end={{x:1160, y:470}} status={stage > 6 ? 'done' : stage === 6 ? 'active' : 'idle'} />
        <Wire id="w7" start={{x:920, y:470}} end={{x:870, y:470}} status={stage > 7 ? 'done' : stage === 7 ? 'active' : 'idle'} />
        <Wire id="w8" start={{x:630, y:470}} end={{x:580, y:470}} status={stage > 8 ? 'done' : stage === 8 ? 'active' : 'idle'} />
        <Wire id="w9" start={{x:340, y:470}} end={{x:290, y:470}} status={stage > 9 ? 'done' : stage === 9 ? 'active' : 'idle'} />

        {nodes.map((n) => {
          // Show last 3 real logs for the currently active node
          const nodeIsActive = stage === n.id;
          const nodeIsDone = stage > n.id;
          const logsForThisNode = deploymentLogs.slice(-3);
          return (
            <div key={n.id} className={`wf-node ${n.pos} ${nodeIsDone ? 'done' : nodeIsActive ? 'active' : ''}`}>
              {n.pL && <div className="port left" />}
              {n.pR && <div className="port right" />}
              {n.pT && <div className="port top" />}
              {n.pB && <div className="port bottom" />}
              
              <div className="wf-node-header">
                <div className="wf-node-icon">{n.id}</div>
                <div className="wf-node-title">{n.name}</div>
              </div>
              <div className="wf-node-body">
                <div className="wf-terminal" ref={nodeIsActive ? terminalRef : null}>
                  {nodeIsActive && logsForThisNode.length > 0 ? (
                    logsForThisNode.map((log: any, i: number) => (
                      <div key={i} className={`wf-terminal-line ${log.level === 'error' ? 'error-text' : 'active-text'}`}>
                        &gt; {log.message.substring(0, 45)}
                      </div>
                    ))
                  ) : nodeIsDone ? (
                    <div className="wf-terminal-line success-text">&gt; ✓ Complete</div>
                  ) : (
                    <div className="wf-terminal-line">&gt; Waiting...</div>
                  )}
                </div>
                {n.id === 10 && stage === 10 && (project.latestDeployment as any)?.deployUrl && (
                  <a href={(project.latestDeployment as any).deployUrl} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm mt-2">
                    <ExternalLink size={12} /> Open URL
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="canvas-controls">
        <button className="btn btn-primary btn-lg glow" onClick={handleDeploy} disabled={deploymentStatus === 'building'}>
          {deploymentStatus === 'building' ? <RefreshCw className="animate-spin" size={18} /> : <Play size={18} fill="currentColor" />}
          {deploymentStatus === 'building' ? 'Pipeline Running...' : 'Start 10-Step Pipeline'}
        </button>
        <button className="btn btn-danger btn-lg" onClick={() => project.latestDeployment && stopDeployment(project.latestDeployment._id)}>
          <Square size={18} fill="currentColor" /> Force Stop
        </button>
      </div>
    </div>
  );
}
