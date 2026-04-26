import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Terminal, Zap, RotateCcw, Shield, GitBranch, Layers, Play } from 'lucide-react';
import { GithubIcon } from '../components/ui/GithubIcon';
import { useAuth } from '../hooks/useAuth';
import '../styles/landing.css';

const DEMO_LOGS = [
  { delay: 0, level: 'info', text: '▸ Cloning repository...' },
  { delay: 600, level: 'info', text: '▸ git clone https://github.com/user/my-app.git' },
  { delay: 1200, level: 'success', text: '✓ Repository cloned successfully' },
  { delay: 1800, level: 'info', text: '▸ Detecting framework... React (Vite)' },
  { delay: 2400, level: 'info', text: '▸ Installing dependencies...' },
  { delay: 3000, level: 'info', text: '▸ npm ci --production' },
  { delay: 3800, level: 'success', text: '✓ 847 packages installed (12.3s)' },
  { delay: 4400, level: 'info', text: '▸ Building application...' },
  { delay: 5000, level: 'info', text: '▸ vite build --mode production' },
  { delay: 5600, level: 'success', text: '✓ Build completed (4.2s)' },
  { delay: 6200, level: 'info', text: '▸ Creating Docker image...' },
  { delay: 6800, level: 'info', text: '▸ Deploying container...' },
  { delay: 7400, level: 'success', text: '✓ Container started on port 4001' },
  { delay: 8000, level: 'success', text: '' },
  { delay: 8200, level: 'success', text: '🚀 Deployment LIVE at https://my-app.deployx.dev' },
];

function AnimatedTerminal() {
  const [visibleLines, setVisibleLines] = useState<typeof DEMO_LOGS>([]);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    DEMO_LOGS.forEach((log, i) => {
      timers.push(setTimeout(() => {
        setVisibleLines((prev) => [...prev, log]);
        if (terminalRef.current) {
          terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
      }, log.delay));
    });

    // Loop
    const loopTimer = setTimeout(() => {
      setVisibleLines([]);
      // Restart
      DEMO_LOGS.forEach((log) => {
        timers.push(setTimeout(() => {
          setVisibleLines((prev) => [...prev, log]);
        }, log.delay + 9500));
      });
    }, 9500);
    timers.push(loopTimer);

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="demo-terminal terminal">
      <div className="terminal-header">
        <div className="terminal-dot red" />
        <div className="terminal-dot yellow" />
        <div className="terminal-dot green" />
        <span className="terminal-title">deployx — build pipeline</span>
      </div>
      <div className="terminal-body" ref={terminalRef}>
        {visibleLines.map((line, i) => (
          <div key={i} className={`terminal-line ${line.level}`}>
            <span className="content">{line.text}</span>
          </div>
        ))}
        {visibleLines.length < DEMO_LOGS.length && (
          <span className="terminal-cursor" />
        )}
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: <Zap size={24} />,
    title: 'One-Click Deploy',
    description: 'Connect your repo and deploy instantly. Auto-detect frameworks, build, and go live in seconds.',
  },
  {
    icon: <Terminal size={24} />,
    title: 'Real-Time Logs',
    description: 'Watch your build happen live with streaming terminal output. Every step visible in real-time.',
  },
  {
    icon: <RotateCcw size={24} />,
    title: 'Instant Rollback',
    description: 'Something broke? Roll back to any previous version with a single click. Zero downtime.',
  },
  {
    icon: <Shield size={24} />,
    title: 'Environment Variables',
    description: 'Manage secrets and configs securely. Different values for dev, staging, and production.',
  },
  {
    icon: <GitBranch size={24} />,
    title: 'Auto Deploy on Push',
    description: 'GitHub webhook integration. Push to main and your app updates automatically.',
  },
  {
    icon: <Layers size={24} />,
    title: 'Docker Powered',
    description: 'Every build runs in an isolated Docker container. Consistent, reproducible deployments.',
  },
];

export default function Landing() {
  const { login } = useAuth();
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  return (
    <div className="landing-page">
      {/* Animated background */}
      <div className="gradient-bg" />
      <div className="grid-overlay" />

      {/* Floating particles */}
      <div className="particles">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${15 + Math.random() * 20}s`,
            }}
          />
        ))}
      </div>

      {/* Nav */}
      <nav className="landing-nav">
        <div className="nav-content">
          <div className="nav-logo">
            <div className="logo-icon">
              <Play size={18} fill="currentColor" />
            </div>
            <span className="logo-text">Deploy<span className="text-gradient">X</span></span>
          </div>
          <button className="btn btn-primary btn-sm" onClick={login} id="nav-login-btn">
            <GithubIcon size={16} />
            Login with GitHub
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero-section">
        <motion.div
          className="hero-content"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <motion.div
            className="hero-badge"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Zap size={14} />
            <span>Built for developers, by developers</span>
          </motion.div>

          <h1 className="hero-title">
            Deploy in <span className="text-gradient">seconds</span>.
            <br />
            Scale <span className="text-gradient">forever</span>.
          </h1>

          <p className="hero-subtitle">
            Connect your GitHub repo, click deploy, and watch your app go live in real-time.
            <br />
            Auto-detect frameworks. Docker-powered builds. Zero config needed.
          </p>

          <div className="hero-actions">
            <motion.button
              className="btn btn-primary btn-lg hero-cta"
              onClick={login}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              id="hero-cta-btn"
            >
              <GithubIcon size={20} />
              Connect GitHub
              <ArrowRight size={18} />
            </motion.button>
            <a href="#features" className="btn btn-secondary btn-lg">
              See Features
            </a>
          </div>

          <div className="hero-stats">
            <div className="stat">
              <span className="stat-value text-gradient">30s</span>
              <span className="stat-label">Avg Deploy Time</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <span className="stat-value text-gradient">100%</span>
              <span className="stat-label">Docker Isolated</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <span className="stat-value text-gradient">1-Click</span>
              <span className="stat-label">Rollback</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="hero-terminal-wrapper"
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.3, ease: 'easeOut' }}
        >
          <AnimatedTerminal />
        </motion.div>
      </section>

      {/* Features */}
      <section className="features-section" id="features">
        <motion.div
          className="features-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="section-title">
            Everything you need to <span className="text-gradient">ship fast</span>
          </h2>
          <p className="section-subtitle">
            A complete deployment pipeline in one beautiful dashboard.
          </p>
        </motion.div>

        <div className="features-grid">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={i}
              className={`feature-card card ${hoveredFeature === i ? 'active' : ''}`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              onMouseEnter={() => setHoveredFeature(i)}
              onMouseLeave={() => setHoveredFeature(null)}
            >
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="how-section">
        <motion.div
          className="features-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="section-title">
            How it <span className="text-gradient">works</span>
          </h2>
        </motion.div>

        <div className="steps-container">
          {[
            { step: '01', title: 'Connect GitHub', desc: 'Login with GitHub OAuth and select your repository.' },
            { step: '02', title: 'Configure', desc: 'We auto-detect your framework. Add env vars if needed.' },
            { step: '03', title: 'Deploy', desc: 'Hit deploy. Watch real-time logs as we build & ship.' },
            { step: '04', title: 'Go Live', desc: 'Your app is live with a unique URL. Auto-deploys on push.' },
          ].map((item, i) => (
            <motion.div
              key={i}
              className="step-card"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
            >
              <span className="step-number text-gradient">{item.step}</span>
              <div>
                <h3 className="step-title">{item.title}</h3>
                <p className="step-desc">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <motion.div
          className="cta-content"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="cta-title">Ready to deploy?</h2>
          <p className="cta-subtitle">Start shipping your projects in seconds. Free forever for open source.</p>
          <motion.button
            className="btn btn-primary btn-lg hero-cta"
            onClick={login}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            id="final-cta-btn"
          >
            <GithubIcon size={20} />
            Get Started Free
            <ArrowRight size={18} />
          </motion.button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="nav-logo">
            <div className="logo-icon">
              <Play size={14} fill="currentColor" />
            </div>
            <span className="logo-text">Deploy<span className="text-gradient">X</span></span>
          </div>
          <p className="footer-text">Built with ❤️ for Sherians Hackathon 2026</p>
        </div>
      </footer>
    </div>
  );
}
