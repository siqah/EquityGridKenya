import { useState, useEffect } from 'react';
import { fetchResults } from '../api/equityApi';
import TurkanaAlertPanel from '../components/Dashboard/TurkanaAlertPanel';

export default function AlertsPage() {
  const [redResults, setRedResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await fetchResults({ classification: 'RED', per_page: 100 });
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
      <div className="flex flex-col items-center justify-center p-16 text-slate-500">
        <div className="w-9 h-9 border-4 border-glass border-t-cyan-accent rounded-full animate-spin mb-4"></div>
        <div className="text-[13px] font-medium">Scanning for anomalies…</div>
      </div>
    );
  }

  const turkanaExceptions = redResults.filter(r => r.flags && r.flags.includes('TURKANA_EXCEPTION'));

  return (
    <div className="p-7 max-w-[1440px] mx-auto">
      <div className="mb-7 animate-[fadeIn_0.5s_ease-out]">
        <h2 className="text-2xl font-extrabold text-slate-50 tracking-[-0.5px] mb-1">Anomaly Alerts</h2>
        <p className="text-[13.5px] text-slate-400">
          {redResults.length} RED classifications detected
          {turkanaExceptions.length > 0 && (
            <span className="text-red-luxury ml-1">
              {' · '}{turkanaExceptions.length} Turkana Exception overrides
            </span>
          )}
        </p>
      </div>

      <TurkanaAlertPanel results={redResults} />

      <div className="glass-window overflow-hidden mt-6 animate-[fadeIn_0.5s_ease-out_0.2s_both]">
        <div className="px-5 py-4 border-b border-glass flex items-center justify-between bg-[rgba(0,43,86,0.3)]">
          <span className="text-[13px] font-semibold text-slate-300 uppercase tracking-widest">🔴 All Red Classifications — Luxury & Cross-Subsidy Contributors</span>
          <span className="text-[11px] text-slate-500">{redResults.length} accounts</span>
        </div>
        <div className="overflow-x-auto">
          <table className="table-glass">
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
                  <td className="font-mono text-[11px] text-slate-500">{r.account_id_hash.substring(0, 16)}…</td>
                  <td>{r.county}</td>
                  <td className="font-mono font-bold text-red-luxury">{r.equity_score.toFixed(1)}</td>
                  <td className="font-bold text-red-luxury">{r.suggested_tariff_multiplier}×</td>
                  <td>{r.total_kwh.toFixed(1)}</td>
                  <td>
                    {r.peak_load_kw.toFixed(1)}
                    {r.has_load_spike && <span className="ml-1.5 text-xs">⚡</span>}
                  </td>
                  <td>KSh {r.token_avg_amount.toFixed(0)}</td>
                  <td>{r.poverty_index}</td>
                  <td>
                    {r.flags && r.flags.includes('TURKANA_EXCEPTION') ? (
                      <span className="bg-red-luxury/15 text-red-luxury px-2 py-0.5 rounded-full text-[10px] font-bold">🚨 TURKANA</span>
                    ) : (
                      <span className="text-slate-500 text-[10px]">LUXURY</span>
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
