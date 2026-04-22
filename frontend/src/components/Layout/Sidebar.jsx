import { NavLink } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Vitals Overview', icon: '📊' },
  { path: '/accounts', label: 'Account Intelligence', icon: '🔍' },
  { path: '/alerts', label: 'Anomaly Alerts', icon: '🚨' },
  { path: '/simulator', label: 'Policy Simulator', icon: '⚖️' },
  { path: '/lookup', label: 'Account Lookup', icon: '🔎' },
  { path: '/methodology', label: 'How AI Works', icon: '🧠' },
];

export default function Sidebar({ mobileOpen, onClose }) {
  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium border-l-[3px] transition-colors no-underline ${
      isActive
        ? 'bg-navactive text-primary border-primary'
        : 'border-transparent text-body hover:bg-surface-muted text-muted hover:text-body'
    }`;

  const nav = (
    <>
      <div className="px-4 pt-6 pb-2 text-[11px] font-semibold text-muted uppercase tracking-wider">
        Dashboard
      </div>
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/'}
          className={linkClass}
          onClick={() => onClose?.()}
        >
          <span className="text-lg w-7 text-center shrink-0" aria-hidden>
            {item.icon}
          </span>
          <span>{item.label}</span>
        </NavLink>
      ))}
      <div className="px-4 pt-6 pb-2 text-[11px] font-semibold text-muted uppercase tracking-wider">
        External
      </div>
      <a
        href="http://127.0.0.1:8000/docs"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted hover:text-body hover:bg-surface-muted no-underline border-l-[3px] border-transparent"
        onClick={() => onClose?.()}
      >
        <span className="text-lg w-7 text-center shrink-0">📡</span>
        <span>API Docs</span>
      </a>
    </>
  );

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          aria-label="Close menu"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-[260px] bg-surface border-r border-border flex flex-col overflow-y-auto transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:flex`}
      >
        <div className="p-5 border-b border-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center text-lg font-bold shrink-0">
            EG
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[15px] font-bold text-primary leading-tight truncate">
              EquityGrid Kenya
            </span>
            <span className="text-[11px] font-medium text-muted uppercase tracking-wide">
              Energy intelligence
            </span>
          </div>
        </div>

        <nav className="p-3 flex-1 flex flex-col gap-0.5">{nav}</nav>

        <div className="p-4 px-5 border-t border-border text-[11px] text-muted leading-relaxed">
          <div className="font-semibold text-primary text-xs mb-1">EPRA</div>
          <p>Built for EPRA Hackathon 2026</p>
        </div>
      </aside>
    </>
  );
}
