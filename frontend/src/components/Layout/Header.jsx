import { useLocation } from 'react-router-dom';
import { useSyntheticData } from '../../context/SyntheticDataContext';

const pageTitles = {
  '/': 'Vitals Overview',
  '/accounts': 'Account Intelligence',
  '/alerts': 'Anomaly Alerts',
  '/simulator': 'Policy Simulator',
  '/lookup': 'Account Lookup',
  '/methodology': 'How AI Works',
};

export default function Header({ onMenu }) {
  const location = useLocation();
  const { stats } = useSyntheticData();
  const title = pageTitles[location.pathname] || 'EquityGrid Kenya';

  return (
    <header className="fixed top-0 left-0 lg:left-[260px] right-0 h-16 bg-surface border-b border-border flex items-center justify-between px-4 md:px-8 z-30">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-border text-primary"
          aria-label="Open menu"
          onClick={onMenu}
        >
          ☰
        </button>
        <h1 className="text-base md:text-lg font-bold text-body truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {stats && (
          <>
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border text-xs font-medium text-body bg-surface-muted">
              <span className="w-2 h-2 rounded-full bg-tier-green" />
              {stats.classification_counts.GREEN} Green
            </div>
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border text-xs font-medium text-body bg-surface-muted">
              <span className="w-2 h-2 rounded-full bg-tier-yellow" />
              {stats.classification_counts.YELLOW} Yellow
            </div>
            <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border text-xs font-medium text-body bg-surface-muted">
              <span className="w-2 h-2 rounded-full bg-tier-red" />
              {stats.classification_counts.RED} Red
            </div>
          </>
        )}
        <div className="inline-flex flex-col items-end leading-tight px-3 py-1.5 rounded-lg bg-primary text-white text-right">
          <span className="text-xs font-semibold">EquityGrid Kenya</span>
          <span className="text-[10px] font-medium text-white/80">v1.0 — Hackathon Build</span>
        </div>
      </div>
    </header>
  );
}
