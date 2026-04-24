import { useMemo } from 'react';
import PageFade from '../components/Layout/PageFade';
import { useSyntheticData } from '../context/SyntheticDataContext';

function flagStyle(flag) {
  if (flag === 'HIGH_DRAW_IN_PRIORITY_ZONE') return 'bg-purple-50 text-purple-800 border-purple-200';
  if (flag === 'HIGH_DRAW_APPLIANCE_DETECTED') return 'bg-red-50 text-tier-red border-red-200';
  if (flag === 'LANDLORD_PATTERN') return 'bg-orange-50 text-orange-800 border-orange-200';
  if (flag === 'THRESHOLD_GAMING') return 'bg-amber-50 text-amber-900 border-amber-200';
  if (flag.startsWith('MULTI_ACCOUNT')) return 'bg-red-950/10 text-red-950 border-red-900/30';
  if (flag === 'UPGRADE_HISTORY') return 'bg-slate-100 text-slate-800 border-slate-200';
  return 'bg-surface-muted text-body border-border';
}

function explainRed(account) {
  if (account.flags?.includes('HIGH_DRAW_IN_PRIORITY_ZONE')) {
    return 'High draw and liquidity signals sit inside one of Kenya’s highest priority counties — classic cross-subsidy leakage.';
  }
  if (account.flags?.includes('THRESHOLD_GAMING')) {
    return 'Consumption hugs subsidy thresholds month after month — statistically rare for genuine vulnerability.';
  }
  if (account.flags?.includes('LANDLORD_PATTERN') || account.flags?.some((f) => f.includes('MULTI_ACCOUNT'))) {
    return 'Meter cluster resembles landlord or multi-unit billing — capacity is aggregated but billed like a single household.';
  }
  if (account.flags?.includes('HIGH_DRAW_APPLIANCE_DETECTED')) {
    return 'Peak demand and kWh bands line up with simultaneous high-draw appliances, not lifeline baseload.';
  }
  return 'Overall RED profile: above-benchmark consumption and liquidity versus declared vulnerability band.';
}

export default function AlertsPage() {
  const { accounts, stats } = useSyntheticData();

  const reds = useMemo(
    () => accounts.filter((a) => a.classification === 'RED').sort((a, b) => b.score - a.score),
    [accounts],
  );

  const priority = reds.slice(0, 5);

  return (
    <PageFade className="p-5 md:p-8 max-w-[1440px] mx-auto">
      <div className="mb-6">
        <p className="text-lg font-semibold text-body">
          {reds.length} RED classifications detected — estimated{' '}
          <span className="text-tier-red">KSh {stats.leakageDetected.toLocaleString()}</span> in annual leakage (model)
        </p>
        <p className="text-sm text-muted mt-1">
          Synthetic anomaly / high-draw layer — use Policy Simulator to test how fees recover this pool.
        </p>
      </div>

      <div className="mb-6">
        <h2 className="text-sm font-bold text-primary mb-3">Priority cases</h2>
        {priority.length === 0 ? (
          <div className="card p-6 text-sm text-muted">No RED accounts in the current dataset.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            {priority.map((a) => {
              const primary = a.flags?.[0] || 'HIGH_DRAW_APPLIANCE_DETECTED';
              return (
                <div key={a.account_hash} className="card p-4 flex flex-col gap-2">
                  <div className="font-mono text-xs font-bold text-primary">{a.account_hash}</div>
                  <div className="text-2xl font-extrabold text-tier-red">{a.score}</div>
                  <div className="text-xs text-muted">{a.county}</div>
                  <div className={`inline-flex px-2 py-1 rounded-full border text-[10px] font-bold w-fit ${flagStyle(primary)}`}>
                    {primary}
                  </div>
                  <p className="text-xs text-muted leading-snug">{explainRed(a)}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <span className="text-sm font-semibold text-primary">All RED accounts</span>
          <span className="text-xs text-muted">{reds.length} rows</span>
        </div>
        <div className="overflow-x-auto">
          {reds.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted">
              No anomalies to display — the synthetic generator may need a refresh.
            </div>
          ) : (
            <table className="table-pro min-w-[980px]">
              <thead>
                <tr>
                  <th>Account hash</th>
                  <th>County</th>
                  <th>Score</th>
                  <th>Tariff</th>
                  <th>kWh / month</th>
                  <th>Peak kW</th>
                  <th>Token avg</th>
                  <th>Baseline index</th>
                  <th>Flags</th>
                </tr>
              </thead>
              <tbody>
                {reds.map((r) => (
                  <tr key={r.account_hash}>
                    <td className="font-mono text-xs font-semibold text-body">{r.account_hash}</td>
                    <td className="text-sm max-w-[220px] truncate">{r.county}</td>
                    <td className="font-mono font-bold text-tier-red">{r.score}</td>
                    <td className="font-semibold text-tier-red">{r.tariff}×</td>
                    <td className="text-sm">{r.kwh_month}</td>
                    <td className="text-sm">{r.peak_kw}</td>
                    <td className="text-sm">KSh {r.token_avg_ksh}</td>
                    <td className="text-sm">{r.baseline_index}</td>
                    <td className="text-xs">
                      <div className="flex flex-wrap gap-1">
                        {(r.flags || []).map((f) => (
                          <span
                            key={f}
                            className={`inline-flex px-2 py-0.5 rounded-full border font-semibold ${flagStyle(f)}`}
                          >
                            {f}
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
      </div>
    </PageFade>
  );
}
