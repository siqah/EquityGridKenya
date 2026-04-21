import { useLocation } from 'react-router-dom';

const pageTitles = {
  '/': 'Vitals Overview',
  '/accounts': 'Account Intelligence',
  '/alerts': 'Anomaly Alerts',
};

export default function Header({ stats }) {
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'EquityGrid Kenya';

  return (
    <header className="header">
      <h1 className="header-title">{title}</h1>

      <div className="header-meta">
        {stats && (
          <>
            <div className="header-badge">
              <span className="header-badge-dot green"></span>
              <span>{stats.classification_counts?.GREEN || 0} Green</span>
            </div>
            <div className="header-badge">
              <span className="header-badge-dot yellow"></span>
              <span>{stats.classification_counts?.YELLOW || 0} Yellow</span>
            </div>
            <div className="header-badge">
              <span className="header-badge-dot red"></span>
              <span>{stats.classification_counts?.RED || 0} Red</span>
            </div>
          </>
        )}
        <div className="header-badge" style={{ color: 'var(--cyan-accent)' }}>
          MVP v0.1
        </div>
      </div>
    </header>
  );
}
