import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import PageFade from '../components/Layout/PageFade';
import { useSyntheticData } from '../context/SyntheticDataContext';

function flagStyle(flag) {
  if (flag === 'LUXURY_IN_POVERTY_ZONE') return 'bg-purple-950/20 text-purple-400 border-purple-800';
  if (flag === 'LUXURY_APPLIANCE_DETECTED') return 'bg-red-950/20 text-tier-red border-red-800';
  if (flag === 'LANDLORD_PATTERN') return 'bg-orange-950/20 text-orange-400 border-orange-800';
  if (flag === 'THRESHOLD_GAMING') return 'bg-amber-950/20 text-amber-400 border-amber-800';
  if (flag.startsWith('MULTI_ACCOUNT')) return 'bg-red-950/20 text-tier-red border-red-800';
  if (flag === 'UPGRADE_HISTORY') return 'bg-slate-900 text-slate-400 border-slate-700';
  return 'bg-slate-900 text-slate-300 border-slate-700';
}

function explainRed(account) {
  if (account.flags?.includes('LUXURY_IN_POVERTY_ZONE')) {
    return 'High use per capita and robust capacity profiles found in a high-poverty index county, indicating tariff leak.';
  }
  if (account.flags?.includes('THRESHOLD_GAMING')) {
    return 'Grid usage strictly floats right beneath the lifeline limit thresholds monthly. Highly anomalous telemetry.';
  }
  if (account.flags?.includes('LANDLORD_PATTERN') || account.flags?.some((f) => f.includes('MULTI_ACCOUNT'))) {
    return 'Multiple active meters registered under a single premises footprint. Resembles commercial landlord sharing.';
  }
  if (account.flags?.includes('LUXURY_APPLIANCE_DETECTED')) {
    return 'Daily evening load curves indicate high discretionary appliance usage rather than baseline shelter heating.';
  }
  return 'High equity score classification with advanced load draw profiles and three-phase connection history.';
}

export default function AlertsPage() {
  const { accounts, stats } = useSyntheticData();

  const reds = useMemo(
    () => accounts.filter((a) => a.classification === 'RED').sort((a, b) => b.final_score - a.final_score),
    [accounts],
  );

  const avgScore = useMemo(() => {
    return reds.length ? Math.round((reds.reduce((s, a) => s + a.final_score, 0) / reds.length) * 10) / 10 : 0;
  }, [reds]);

  const criticalCount = useMemo(() => {
    return reds.filter((r) => r.final_score >= 85).length;
  }, [reds]);

  const priority = reds.slice(0, 5);

  const handleExport = () => {
    const headers = ['Account Hash', 'County', 'Score', 'Suggested Tariff', 'kWh/Month', 'Peak Ratio', 'Three Phase', 'Active Meters', 'Flags'];
    const rows = reds.map(r => [
      r.account_hash,
      r.county,
      r.final_score,
      r.tariff,
      r.kwh_month,
      r.peak_demand_ratio,
      r.has_three_phase ? 'YES' : 'NO',
      r.accounts_same_address,
      (r.flags || []).join('; ')
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `epra_leakage_watchlist_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <PageFade className="p-5 md:p-8 max-w-[1440px] mx-auto space-y-6">
      {/* Alert Header Banner */}
      <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-4 gap-4">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest bg-rose-50 text-tier-red px-2.5 py-1 rounded-full border border-rose-200 font-bold">
            🔴 Watchdog Audit Active
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-2">
            Cross-Subsidy Leakage Watchlist
          </h1>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            Telemetry rules monitor for high-income or high-capacity accounts consuming grid resources meant for lifeline protection.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold rounded-lg shadow transition-colors flex items-center gap-2 self-start md:self-center"
        >
          📥 Export Audit List (CSV)
        </button>
      </header>

      {/* Telemetry KPI Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between min-h-[120px]">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Flagged Accounts</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{reds.length}</div>
          </div>
          <span className="text-xs text-muted leading-tight">Accounts showing high leakage risks</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between min-h-[120px]">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estimated Revenue Leakage</span>
            <div className="text-2xl font-black text-tier-red mt-1">KSh {stats.leakageDetected.toLocaleString()}</div>
          </div>
          <span className="text-xs text-muted leading-tight">Annualized subsidy value at risk</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between min-h-[120px]">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Critical Severity (Index ≥85)</span>
            <div className="text-2xl font-black text-rose-700 mt-1">{criticalCount}</div>
          </div>
          <span className="text-xs text-muted leading-tight">High-confidence commercial profiles</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between min-h-[120px]">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Average Watchdog Risk Score</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{avgScore}</div>
          </div>
          <span className="text-xs text-muted leading-tight">Weighted baseline of watchlist</span>
        </div>
      </section>

      {/* Priority Alerts Callout Cards */}
      <section>
        <h2 className="text-xs uppercase font-mono tracking-widest text-primary font-bold mb-3">
          Top Critical Watchdog Matches
        </h2>
        {priority.length === 0 ? (
          <div className="card p-6 text-sm text-center text-muted">No RED accounts found. Adjust simulator weights to view.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            {priority.map((a) => {
              const primaryFlag = a.flags?.[0] || 'LUXURY_APPLIANCE_DETECTED';
              return (
                <div 
                  key={a.account_hash} 
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between gap-3 hover:border-slate-300 transition-all border-t-4 border-t-rose-500 min-h-[220px]"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-1">
                      <Link 
                        to={`/household/${encodeURIComponent(a.account_hash)}`}
                        className="font-mono text-xs font-bold text-primary truncate hover:underline hover:text-blue-600 block"
                      >
                        {a.account_hash.slice(0, 12)}…
                      </Link>
                      <span className="text-[10px] font-bold text-slate-400 font-mono">
                        {a.county}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black text-slate-900">{a.final_score}</span>
                      <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Risk Index</span>
                    </div>

                    <span className={`inline-flex px-2 py-0.5 rounded border text-[9px] font-bold tracking-wide w-fit ${flagStyle(primaryFlag)}`}>
                      {primaryFlag.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed italic border-t border-slate-100 pt-2.5">
                    "{explainRed(a)}"
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Full Watchlist Register */}
      <section className="card overflow-hidden border-slate-200">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between flex-wrap gap-2">
          <div>
            <span className="text-sm font-semibold text-primary">All Identified Grid Leakages</span>
            <p className="text-xs text-slate-400 mt-0.5">Interactive register of all accounts flagged with RED posture indexes.</p>
          </div>
          <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2.5 py-1 rounded border border-slate-200 font-bold">
            {reds.length} Rows
          </span>
        </div>
        
        <div className="overflow-x-auto">
          {reds.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted bg-white">
              No anomalies found. The grid model has no RED categorizations.
            </div>
          ) : (
            <table className="table-pro min-w-[980px]">
              <thead>
                <tr>
                  <th>Account Node Hash</th>
                  <th>County Name</th>
                  <th>Risk Score</th>
                  <th>Model Tariff</th>
                  <th>kWh / Month</th>
                  <th>Peak Ratio</th>
                  <th>Three Phase</th>
                  <th>Meters</th>
                  <th>Watchdog Flags</th>
                </tr>
              </thead>
              <tbody>
                {reds.map((r) => (
                  <tr key={r.account_hash} className="hover:bg-slate-50/50 transition-colors">
                    <td className="font-mono text-xs font-semibold text-body">
                      <Link 
                        to={`/household/${encodeURIComponent(r.account_hash)}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {r.account_hash}
                      </Link>
                    </td>
                    <td className="text-sm">{r.county}</td>
                    <td className="font-mono font-black text-tier-red text-sm">{r.final_score}</td>
                    <td className="font-bold text-tier-red text-xs">{r.tariff}×</td>
                    <td className="text-sm font-mono">{r.kwh_month.toLocaleString()}</td>
                    <td className="text-sm font-mono">{Math.round(r.peak_demand_ratio * 100)}%</td>
                    <td className="text-xs font-bold text-slate-500">
                      {r.has_three_phase ? (
                        <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">3-Phase</span>
                      ) : (
                        'Single'
                      )}
                    </td>
                    <td className="text-sm font-mono text-center">{r.accounts_same_address}</td>
                    <td className="text-xs">
                      <div className="flex flex-wrap gap-1">
                        {(r.flags || []).map((f) => (
                          <span
                            key={f}
                            className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold border tracking-wide ${flagStyle(f)}`}
                          >
                            {f.replace(/_/g, ' ')}
                          </span>
                        ))}
                        {(!r.flags || r.flags.length === 0) && <span className="text-muted">—</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </PageFade>
  );
}
