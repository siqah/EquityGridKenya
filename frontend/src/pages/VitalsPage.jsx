import { useState, useEffect } from 'react';
import KPICard from '../components/Dashboard/KPICard';
import ClassificationChart from '../components/Dashboard/ClassificationChart';
import ScoreDistribution from '../components/Dashboard/ScoreDistribution';
import TurkanaAlertPanel from '../components/Dashboard/TurkanaAlertPanel';
import SignalBreakdown from '../components/Dashboard/SignalBreakdown';
import { fetchStats, fetchResults } from '../api/equityApi';

/**
 * Vitals Overview — Landing page with KPI cards, charts, and anomaly alerts.
 */
export default function VitalsPage() {
  const [stats, setStats] = useState(null);
  const [allResults, setAllResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [statsData, resultsData] = await Promise.all([
          fetchStats(),
          fetchResults({ per_page: 100 }),
        ]);
        setStats(statsData);
        setAllResults(resultsData.results || []);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-slate-500">
        <div className="w-9 h-9 border-4 border-glass border-t-cyan-accent rounded-full animate-spin mb-4"></div>
        <div className="text-[13px] font-medium">Loading equity intelligence…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-slate-500">
        <div className="text-[32px] mb-3">⚠️</div>
        <div className="text-[13px] font-medium text-red-400">
          Failed to connect to EquityGrid API
        </div>
        <div className="text-xs text-slate-500 mt-2">
          Ensure FastAPI is running: <code className="bg-navy-800 px-2 py-1 rounded">uvicorn app.main:app --port 8000</code>
        </div>
      </div>
    );
  }

  // Compute KPI values
  const greenCount = stats?.classification_counts?.GREEN || 0;
  const redCount = stats?.classification_counts?.RED || 0;
  const totalAccounts = stats?.total_accounts || 0;

  // Estimated subsidy savings (GREEN accounts × avg 0.4 reduction × avg KSh 500/mo)
  const subsidyManaged = greenCount * 500 * 0.4;

  // Estimated leakage detected (RED accounts × avg excess × tariff multiplier)
  const leakageDetected = redCount * 2500 * 0.4;

  // Revenue balance (leakage recovery - subsidy outflow)
  const revenueBalance = leakageDetected - subsidyManaged;

  return (
    <div className="p-7 max-w-[1440px] mx-auto">
      {/* Page Header */}
      <div className="mb-7 animate-[fadeIn_0.5s_ease-out]">
        <h2 className="text-2xl font-extrabold text-slate-50 tracking-[-0.5px] mb-1">Vitals Overview</h2>
        <p className="text-[13.5px] text-slate-400">
          Real-time equity intelligence across {stats?.counties_covered || 0} counties
          {' · '}{totalAccounts} accounts scored
          {stats?.turkana_exceptions > 0 && (
            <span className="text-red-luxury ml-1">
              {'· '}{stats.turkana_exceptions} anomalies detected
            </span>
          )}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-7">
        <KPICard
          label="Total Subsidies Managed"
          value={`KSh ${subsidyManaged.toLocaleString()}`}
          detail={`${greenCount} households qualifying for GREEN tariff (0.60×)`}
          colorClass="green"
          icon="🟢"
          delay={1}
        />
        <KPICard
          label="Detected Leakage"
          value={`KSh ${leakageDetected.toLocaleString()}`}
          detail={`${redCount} luxury/anomaly accounts flagged (1.40× tariff)`}
          colorClass="red"
          icon="🔴"
          delay={2}
        />
        <KPICard
          label="Revenue Balance"
          value={`KSh ${revenueBalance >= 0 ? '+' : ''}${revenueBalance.toLocaleString()}`}
          detail={revenueBalance >= 0 ? 'Cross-subsidy model is revenue positive' : 'Subsidy outflow exceeds leakage recovery'}
          colorClass={revenueBalance >= 0 ? 'cyan' : 'yellow'}
          icon="⚖️"
          delay={3}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-7">
        <ClassificationChart stats={stats} />
        <ScoreDistribution results={allResults} />
      </div>

      {/* Turkana Exception Alerts */}
      <TurkanaAlertPanel results={allResults} />

      {/* Signal Breakdown */}
      <div className="mt-5">
        <SignalBreakdown results={allResults} />
      </div>
    </div>
  );
}
