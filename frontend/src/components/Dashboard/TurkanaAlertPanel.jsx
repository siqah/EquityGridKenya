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
    <div className="glass-window border-[rgba(231,76,60,0.25)] bg-[rgba(231,76,60,0.06)] animate-[fadeIn_0.5s_ease-out_0.3s_both]">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[rgba(231,76,60,0.15)]">
        <span className="text-xl">🚨</span>
        <span className="text-[13px] font-bold text-red-luxury uppercase tracking-[1px]">Turkana Exception — Anomaly Detection</span>
        <span className="ml-auto bg-red-luxury text-white text-[11px] font-extrabold px-3 py-0.5 rounded-full">{turkanaExceptions.length}</span>
      </div>
      <div>
        {turkanaExceptions.map((item, idx) => (
          <div key={idx} className="px-6 py-3.5 border-b border-[rgba(231,76,60,0.08)] flex items-center gap-4 transition-colors hover:bg-[rgba(231,76,60,0.04)] last:border-0">
            <span className="font-mono text-[11px] text-slate-400 min-w-[140px]">
              {item.account_id_hash.substring(0, 16)}…
            </span>
            <span className="text-xs text-slate-300">
              <span className="font-bold text-red-luxury">{item.total_kwh} kWh</span>
              {' · '}Peak: {item.peak_load_kw} kW
              {' · '}Score: {item.equity_score}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-[0.5px] uppercase bg-red-luxury/15 text-red-luxury border border-red-luxury/30">RED</span>
          </div>
        ))}
      </div>
    </div>
  );
}
