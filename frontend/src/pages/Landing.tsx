import { ArrowRight, Upload, Zap, Server, Globe, X, Check, Shield, GitBranch, Cpu, Cloud } from 'lucide-react';
import '../styles/landing.css';
import { useAuth } from '../hooks/useAuth';

export default function Landing() {
  const { login } = useAuth();

  return (
    <div className="mwx-landing">
      <div className="mwx-bg-glow" />

      {/* Navbar */}
      <nav className="mwx-nav">
        <div className="mwx-logo">Deploy<span style={{color: 'var(--mw-gold)'}}>X</span></div>
        <div className="mwx-nav-links hidden md:flex">
          <span>Workflow</span>
          <span>Features</span>
          <span>Pricing</span>
        </div>
        <div className="mwx-nav-auth">
          <span className="login" onClick={login}>Login</span>
          <span className="register" onClick={login}>Register</span>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="mwx-hero">
        <div className="hero-badge">DeployX • Est. 2026</div>
        <h1 className="mwx-hero-title">
          Simplify<br/>
          Your Deployment<br/>
          <span className="hollow">Workflow.</span>
        </h1>
        <p className="mwx-hero-desc">
          DeployX connects your GitHub directly to your EC2 servers. Connect, analyze, build, and publish applications automatically — all in one secure workspace.
        </p>
        <div>
          <button className="mwx-btn-primary" onClick={login}>
            Start Free Trial <ArrowRight size={14} />
          </button>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="mwx-section">
        <div className="section-label">How It Works</div>
        <h2 className="section-title">From Commit to <span className="serif-italic">Published.</span></h2>
        <p className="section-subtitle">A completely autonomous AI workflow that builds and routes your code while you sleep.</p>
        
        <div className="mwx-timeline">
          <div className="timeline-line" />
          
          <div className="timeline-item">
            <div className="timeline-content">
              <span className="t-phase">PHASE 01</span>
              <h3 className="t-title">Connect Repository</h3>
              <p className="t-desc">Link your GitHub repository securely. No more manual EC2 SSH logins or FTP file transfers. Your code syncs seamlessly.</p>
            </div>
            <div className="timeline-node" />
            <div className="timeline-icon"><Upload size={20} /></div>
          </div>

          <div className="timeline-item left">
            <div className="timeline-content">
              <span className="t-phase bg">POWERED BY AI</span>
              <h3 className="t-title">AI System Analysis</h3>
              <p className="t-desc">Our multimodal AI analyzes your codebase to detect frameworks, monorepos, and required environment configurations automatically.</p>
            </div>
            <div className="timeline-node" />
            <div className="timeline-icon"><Zap size={20} /></div>
          </div>

          <div className="timeline-item">
            <div className="timeline-content">
              <span className="t-phase">PHASE 03</span>
              <h3 className="t-title">Container Build</h3>
              <p className="t-desc">The system dynamically creates an optimized multi-stage Dockerfile and builds an isolated container image for your application.</p>
            </div>
            <div className="timeline-node" />
            <div className="timeline-icon"><Server size={20} /></div>
          </div>

          <div className="timeline-item left">
            <div className="timeline-content">
              <span className="t-phase">PHASE 04</span>
              <h3 className="t-title">Proxy Routing</h3>
              <p className="t-desc">Your container goes live instantly. Traffic is routed automatically using Reverse Proxy mechanisms without manual NGINX configs.</p>
            </div>
            <div className="timeline-node" />
            <div className="timeline-icon"><Globe size={20} /></div>
          </div>
        </div>
      </section>

      {/* Comparison Grid */}
      <section className="mwx-section">
        <div className="section-label">The Difference</div>
        <h2 className="section-title">The End of <span className="serif-italic" style={{color: 'var(--mw-red)'}}>Chaos.</span></h2>
        <p className="section-subtitle">Say goodbye to the fragmented, scattered deployment scripts of the past. DeployX replaces an entire ecosystem of DevOps tools with one unified engine.</p>
        
        <div className="comparison-grid">
          <div className="comp-card">
            <h3 className="comp-title"><X className="comp-icon red"/> The Old Way</h3>
            <div className="comp-list">
              <div className="comp-item"><X size={16} className="comp-icon red" style={{flexShrink: 0}}/> Struggle to configure NGINX and Reverse Proxies manually.</div>
              <div className="comp-item"><X size={16} className="comp-icon red" style={{flexShrink: 0}}/> Dealing with heavy Node Module installations crashing servers.</div>
              <div className="comp-item"><X size={16} className="comp-icon red" style={{flexShrink: 0}}/> Scattered communication across GitHub and CLI causing delays.</div>
              <div className="comp-item"><X size={16} className="comp-icon red" style={{flexShrink: 0}}/> Unclear port mappings, risk of container conflicts.</div>
            </div>
          </div>
          <div className="comp-card good">
            <h3 className="comp-title"><Check className="comp-icon gold"/> The DeployX Way</h3>
            <div className="comp-list">
              <div className="comp-item"><Check size={16} className="comp-icon gold" style={{flexShrink: 0}}/> Autonomous AI Agent generates Dockerfiles without human intervention.</div>
              <div className="comp-item"><Check size={16} className="comp-icon gold" style={{flexShrink: 0}}/> No SSH access needed, no port configuration nightmares.</div>
              <div className="comp-item"><Check size={16} className="comp-icon gold" style={{flexShrink: 0}}/> Zero build crash hassle—everything processes securely inside the platform.</div>
              <div className="comp-item"><Check size={16} className="comp-icon gold" style={{flexShrink: 0}}/> Built-in Reverse Proxy directly to a public subdomain.</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="mwx-section">
        <div className="section-label">Capabilities</div>
        <h2 className="section-title">Built for <span className="serif-italic">Scale.</span></h2>
        <p className="section-subtitle">Everything you need to manage secure container workflows, organized in one powerful dashboard.</p>
        
        <div className="features-grid">
          <div className="feature-card">
            <Cpu className="feature-icon" size={24} />
            <h4 className="feature-title">Autonomous AI Agent</h4>
            <p className="feature-desc">AI automatically detects missing dependencies, analyzes errors, and optimizes build stages. Zero manual YAML editing required.</p>
          </div>
          <div className="feature-card">
            <Shield className="feature-icon" size={24} />
            <h4 className="feature-title">Unified Workspace</h4>
            <p className="feature-desc">No more scattered terminals. Manage GitHub repositories, environment variables, and live logs natively in one platform.</p>
          </div>
          <div className="feature-card">
            <Globe className="feature-icon" size={24} />
            <h4 className="feature-title">Direct Proxy Routing</h4>
            <p className="feature-desc">Push final builds straight to public URLs. No configuring DNS records manually or handling NGINX configs again.</p>
          </div>
          <div className="feature-card">
            <Cloud className="feature-icon" size={24} />
            <h4 className="feature-title">Monorepo Support</h4>
            <p className="feature-desc">Access intelligent scanners that safely separate Frontend and Backend codebases securely without conflict.</p>
          </div>
        </div>
      </section>
      
      {/* Footer Spacer */}
      <div style={{height: '100px'}} />
    </div>
  );
}
