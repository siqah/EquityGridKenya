import { useLocation, useNavigate } from 'react-router-dom';
import { useSyntheticData } from '../../context/SyntheticDataContext';
import { useDashboardMode } from '../../context/DashboardModeContext';

const pageTitles = {
  '/': 'Vitals Overview',
  '/accounts': 'Account Intelligence',
  '/alerts': 'Anomaly Alerts',
  '/simulator': 'Policy Simulator',
  '/lookup': 'Account Lookup',
  '/methodology': 'How AI Works',
  '/my-energy-report': 'Your Energy Report',
  '/my-account': 'My Account',
};

const householdMatch = /^\/household\//;

export default function Header({ onMenu }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { stats } = useSyntheticData();
  const { setMode, isHousehold, householdAccountHash } = useDashboardMode();

  const title = householdMatch.test(location.pathname)
    ? 'Your Energy Report'
    : pageTitles[location.pathname] || 'EquityGrid Kenya';

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
        <div className="hidden sm:flex items-center gap-2 md:gap-3">
          <button
            type="button"
            className="hidden md:inline-flex w-10 h-10 items-center justify-center rounded-full border border-border text-muted hover:text-body hover:bg-surface-muted"
            aria-label="Search"
          >
            🔍
          </button>

          <div
            className="hidden md:inline-flex items-center rounded-full bg-slate-100/90 p-0.5 border border-border/80 shadow-inner"
            role="group"
            aria-label="Dashboard view"
          >
            <button
              type="button"
              onClick={() => {
                setMode('regulator');
                navigate('/');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                !isHousehold ? 'bg-white text-primary shadow-sm' : 'text-muted hover:text-body'
              }`}
            >
              <span aria-hidden>🛡</span>
              Regulator
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('household');
                if (householdAccountHash) navigate('/my-account');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                isHousehold ? 'bg-white text-primary shadow-sm' : 'text-muted hover:text-body'
              }`}
            >
              <span aria-hidden>🏠</span>
              My Account
            </button>
          </div>

          <div
            className="hidden md:flex w-9 h-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 border border-border items-center justify-center text-xs font-bold text-slate-600"
            title="Profile"
          >
            ME
          </div>
        </div>

        {stats && (
          <>
            <div className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border text-xs font-medium text-body bg-surface-muted">
              <span className="w-2 h-2 rounded-full bg-tier-green" />
              {stats.classification_counts.GREEN} Green
            </div>
            <div className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border text-xs font-medium text-body bg-surface-muted">
              <span className="w-2 h-2 rounded-full bg-tier-yellow" />
              {stats.classification_counts.YELLOW} Yellow
            </div>
            <div className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border text-xs font-medium text-body bg-surface-muted">
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
