import { NavLink, useLocation } from 'react-router-dom';

export default function Sidebar() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Vitals Overview', icon: '📊' },
    { path: '/accounts', label: 'Account Intelligence', icon: '🔍' },
    { path: '/alerts', label: 'Anomaly Alerts', icon: '🚨' },
  ];

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">⚡</div>
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-name">EquityGrid Kenya</span>
          <span className="sidebar-brand-sub">Energy Intelligence</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Dashboard</div>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
            end={item.path === '/'}
          >
            <span className="sidebar-link-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}

        <div className="sidebar-section-label" style={{ marginTop: '16px' }}>
          External
        </div>
        <a
          href="http://localhost:8000/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="sidebar-link"
        >
          <span className="sidebar-link-icon">📡</span>
          <span>API Docs</span>
        </a>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-status">
          <span className="sidebar-status-dot"></span>
          <span>FastAPI Engine Connected</span>
        </div>
      </div>
    </aside>
  );
}
