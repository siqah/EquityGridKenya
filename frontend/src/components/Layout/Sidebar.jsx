import { NavLink, useLocation } from 'react-router-dom';

export default function Sidebar() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Vitals Overview', icon: '📊' },
    { path: '/accounts', label: 'Account Intelligence', icon: '🔍' },
    { path: '/alerts', label: 'Anomaly Alerts', icon: '🚨' },
  ];

  return (
    <aside className="fixed top-0 left-0 w-[260px] h-screen bg-gradient-to-b from-navy-800 to-navy-900 border-r border-glass flex flex-col z-50 overflow-y-auto">
      {/* Brand */}
      <div className="p-[20px] px-[22px] border-b border-glass flex items-center gap-[12px]">
        <div className="w-[38px] h-[38px] rounded-md bg-gradient-to-br from-green-subsidy to-cyan-accent flex items-center justify-center text-[18px] font-extrabold text-navy-900 shrink-0">⚡</div>
        <div className="flex flex-col">
          <span className="text-[15px] font-bold text-slate-50 tracking-[-0.3px] leading-[1.2]">EquityGrid Kenya</span>
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-[1.5px]">Energy Intelligence</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 px-3 flex-1">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-[1.8px] px-3 pt-4 pb-2">Dashboard</div>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-[12px] px-[12px] py-[10px] rounded-md text-[13.5px] transition-all duration-150 cursor-pointer no-underline mb-[2px] ${isActive ? 'text-cyan-accent bg-cyan-accent-dim font-semibold' : 'text-slate-400 font-medium hover:text-slate-100 hover:bg-[rgba(0,58,117,0.3)]'}`
            }
            end={item.path === '/'}
          >
            <span className="text-[17px] w-[22px] text-center shrink-0">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}

        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-[1.8px] px-3 pt-4 pb-2 mt-4">
          External
        </div>
        <a
          href="http://localhost:8000/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-[12px] px-[12px] py-[10px] rounded-md text-[13.5px] text-slate-400 font-medium hover:text-slate-100 hover:bg-[rgba(0,58,117,0.3)] transition-all duration-150 mb-[2px] cursor-pointer no-underline"
        >
          <span className="text-[17px] w-[22px] text-center shrink-0">📡</span>
          <span>API Docs</span>
        </a>
      </nav>

      {/* Footer */}
      <div className="p-4 px-[22px] border-t border-glass">
        <div className="flex items-center gap-[8px] text-[11px] text-slate-500">
          <span className="w-[7px] h-[7px] rounded-full bg-green-subsidy shadow-glow-green animate-pulse-dot"></span>
          <span>FastAPI Engine Connected</span>
        </div>
      </div>
    </aside>
  );
}
