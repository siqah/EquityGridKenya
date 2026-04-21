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
      <div className="loading-state">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading equity intelligence…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="loading-state">
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
        <div className="loading-text">
          Failed to connect to EquityGrid API
        </div>
        <div style={{ fontSize: '12px', color: 'var(--slate-500)', marginTop: '8px' }}>
          Ensure FastAPI is running: <code>uvicorn app.main:app --port 8000</code>
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
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header fade-in">
        <h2 className="page-title">Vitals Overview</h2>
        <p className="page-subtitle">
          Real-time equity intelligence across {stats?.counties_covered || 0} counties
          {' · '}{totalAccounts} accounts scored
          {stats?.turkana_exceptions > 0 && (
            <span style={{ color: 'var(--red-luxury)' }}>
              {' · '}{stats.turkana_exceptions} anomalies detected
            </span>
          )}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
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
      <div className="charts-grid">
        <ClassificationChart stats={stats} />
        <ScoreDistribution results={allResults} />
      </div>

      {/* Turkana Exception Alerts */}
      <TurkanaAlertPanel results={allResults} />

      {/* Signal Breakdown */}
      <div style={{ marginTop: '20px' }}>
        <SignalBreakdown results={allResults} />
      </div>
    </div>
  );
}
