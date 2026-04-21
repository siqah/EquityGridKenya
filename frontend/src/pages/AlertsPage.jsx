import { useState, useEffect } from 'react';
import { fetchResults } from '../api/equityApi';
import TurkanaAlertPanel from '../components/Dashboard/TurkanaAlertPanel';

/**
 * Anomaly Alerts Page — Focused view on RED classifications and Turkana Exceptions.
 */
export default function AlertsPage() {
  const [redResults, setRedResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await fetchResults({
          classification: 'RED',
          per_page: 100,
        });
        setRedResults(data.results || []);
      } catch (err) {
        console.error('Failed to load alerts:', err);
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
        <div className="loading-text">Scanning for anomalies…</div>
      </div>
    );
  }

  const turkanaExceptions = redResults.filter(
    r => r.flags && r.flags.includes('TURKANA_EXCEPTION')
  );
  const standardReds = redResults.filter(
    r => !r.flags || !r.flags.includes('TURKANA_EXCEPTION')
  );

  return (
    <div className="page-container">
      <div className="page-header fade-in">
        <h2 className="page-title">Anomaly Alerts</h2>
        <p className="page-subtitle">
          {redResults.length} RED classifications detected
          {turkanaExceptions.length > 0 && (
            <span style={{ color: 'var(--red-luxury)' }}>
              {' · '}{turkanaExceptions.length} Turkana Exception overrides
            </span>
          )}
        </p>
      </div>

      {/* Turkana Exception Panel */}
      <TurkanaAlertPanel results={redResults} />

      {/* All RED accounts */}
      <div className="glass-card fade-in fade-in-delay-2" style={{ marginTop: '20px' }}>
        <div className="glass-card-header">
          <span className="glass-card-title">
            🔴 All Red Classifications — Luxury & Cross-Subsidy Contributors
          </span>
          <span style={{ fontSize: '11px', color: 'var(--slate-500)' }}>
            {redResults.length} accounts
          </span>
        </div>
        <div className="data-table-wrapper">
          <table className="data-table" id="alerts-table">
            <thead>
              <tr>
                <th>Account Hash</th>
                <th>County</th>
                <th>Score</th>
                <th>Tariff</th>
                <th>kWh / Month</th>
                <th>Peak Load (kW)</th>
                <th>Token Avg</th>
                <th>Poverty Index</th>
                <th>Flags</th>
              </tr>
            </thead>
            <tbody>
              {redResults.map(r => (
                <tr key={r.account_id_hash}>
                  <td className="hash-cell">{r.account_id_hash.substring(0, 16)}…</td>
                  <td>{r.county}</td>
                  <td className="score-cell red">{r.equity_score.toFixed(1)}</td>
                  <td style={{ fontWeight: 700, color: 'var(--red-luxury)' }}>
                    {r.suggested_tariff_multiplier}×
                  </td>
                  <td>{r.total_kwh.toFixed(1)}</td>
                  <td>
                    {r.peak_load_kw.toFixed(1)}
                    {r.has_load_spike && (
                      <span style={{ marginLeft: '6px', fontSize: '12px' }}>⚡</span>
                    )}
                  </td>
                  <td>KSh {r.token_avg_amount.toFixed(0)}</td>
                  <td>{r.poverty_index}</td>
                  <td>
                    {r.flags && r.flags.includes('TURKANA_EXCEPTION') ? (
                      <span style={{
                        background: 'rgba(231, 76, 60, 0.15)',
                        color: 'var(--red-luxury)',
                        padding: '2px 8px',
                        borderRadius: '100px',
                        fontSize: '10px',
                        fontWeight: 700,
                      }}>
                        🚨 TURKANA
                      </span>
                    ) : (
                      <span style={{ color: 'var(--slate-500)', fontSize: '10px' }}>LUXURY</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
