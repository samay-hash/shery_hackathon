import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, LayoutDashboard, FolderGit2, Settings, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useAppStore } from '../../store/appStore';
import '../../styles/layout.css';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { sidebarOpen, toggleSidebar, projects } = useAppStore();
  const [activeNav, setActiveNav] = useState('dashboard');

  const navItems = [
    { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard', hash: '#/dashboard' },
    { id: 'projects', icon: <FolderGit2 size={20} />, label: 'Projects', hash: '#/dashboard' },
    { id: 'settings', icon: <Settings size={20} />, label: 'Settings', hash: '#/settings' },
  ];

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <motion.aside
        className={`sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}
        animate={{ width: sidebarOpen ? 260 : 68 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon">
              <Play size={16} fill="currentColor" />
            </div>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.span
                  className="logo-text"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                >
                  Deploy<span className="text-gradient">X</span>
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <button className="btn btn-icon sidebar-toggle" onClick={toggleSidebar}>
            {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={item.hash}
              className={`nav-item ${activeNav === item.id ? 'active' : ''}`}
              onClick={() => setActiveNav(item.id)}
              title={!sidebarOpen ? item.label : undefined}
            >
              <span className="nav-icon">{item.icon}</span>
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span
                    className="nav-label"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </a>
          ))}
        </nav>

        {/* Project Quick Links */}
        {sidebarOpen && projects.length > 0 && (
          <div className="sidebar-projects">
            <span className="sidebar-section-label">Recent Projects</span>
            {projects.slice(0, 5).map((project) => (
              <a
                key={project._id}
                href={`#/project/${project._id}`}
                className="sidebar-project-item"
              >
                <span className={`status-dot ${project.latestDeployment?.status || 'queued'}`} />
                <span className="sidebar-project-name">{project.name}</span>
              </a>
            ))}
          </div>
        )}

        {/* User */}
        <div className="sidebar-footer">
          {user && (
            <div className="sidebar-user">
              <img src={user.avatarUrl} alt={user.username} className="user-avatar" />
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.div
                    className="user-info"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <span className="user-name">{user.username}</span>
                    <button className="btn btn-ghost btn-sm logout-btn" onClick={logout}>
                      <LogOut size={14} />
                      Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="gradient-bg" />
        {children}
      </main>
    </div>
  );
}
