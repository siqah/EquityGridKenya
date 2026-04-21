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
    <header className="fixed top-0 left-[260px] right-0 h-[64px] bg-[rgba(0,18,40,0.85)] border-b border-glass backdrop-blur-md flex items-center justify-between px-8 z-40">
      <h1 className="text-base font-semibold text-slate-100">{title}</h1>

      <div className="flex items-center gap-5">
        {stats && (
          <>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[rgba(0,43,86,0.45)] border border-glass hover:border-glass-hover rounded-full text-[11.5px] font-medium text-slate-300 transition-colors">
              <span className="w-[6px] h-[6px] rounded-full bg-green-subsidy"></span>
              <span>{stats.classification_counts?.GREEN || 0} Green</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[rgba(0,43,86,0.45)] border border-glass hover:border-glass-hover rounded-full text-[11.5px] font-medium text-slate-300 transition-colors">
              <span className="w-[6px] h-[6px] rounded-full bg-yellow-standard"></span>
              <span>{stats.classification_counts?.YELLOW || 0} Yellow</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[rgba(0,43,86,0.45)] border border-glass hover:border-glass-hover rounded-full text-[11.5px] font-medium text-slate-300 transition-colors">
              <span className="w-[6px] h-[6px] rounded-full bg-red-luxury"></span>
              <span>{stats.classification_counts?.RED || 0} Red</span>
            </div>
          </>
        )}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[rgba(0,43,86,0.45)] border border-glass hover:border-glass-hover rounded-full text-[11.5px] font-medium text-cyan-accent transition-colors">
          MVP v0.1
        </div>
      </div>
    </header>
  );
}
