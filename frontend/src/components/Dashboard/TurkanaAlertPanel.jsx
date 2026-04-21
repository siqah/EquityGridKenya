/**
 * Turkana Exception Alert Panel
 * Highlights luxury consumption anomalies in high-poverty zones.
 */
export default function TurkanaAlertPanel({ results }) {
  if (!results) return null;

  const turkanaExceptions = results.filter(
    r => r.flags && r.flags.includes('TURKANA_EXCEPTION')
  );

  if (turkanaExceptions.length === 0) return null;

  return (
    <div className="glass-card alert-panel fade-in fade-in-delay-3">
      <div className="alert-panel-header">
        <span className="alert-panel-icon">🚨</span>
        <span className="alert-panel-title">Turkana Exception — Anomaly Detection</span>
        <span className="alert-panel-count">{turkanaExceptions.length}</span>
      </div>
      <div>
        {turkanaExceptions.map((item, idx) => (
          <div key={idx} className="alert-item">
            <span className="alert-item-hash">
              {item.account_id_hash.substring(0, 16)}…
            </span>
            <span className="alert-item-detail">
              <span className="alert-item-kwh">{item.total_kwh} kWh</span>
              {' · '}Peak: {item.peak_load_kw} kW
              {' · '}Score: {item.equity_score}
            </span>
            <span className="classification-badge RED">RED</span>
          </div>
        ))}
      </div>
    </div>
  );
}
