import { useState, useEffect } from 'react';
import { fetchResults } from '../api/equityApi';

export default function AccountsPage() {
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState(null);
  const [loading, setLoading] = useState(true);

  const perPage = 20;

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await fetchResults({ page, per_page: perPage, classification: filter });
        setResults(data.results || []);
        setTotal(data.total || 0);
      } catch (err) {
        console.error('Failed to load results:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [page, filter]);

  const totalPages = Math.ceil(total / perPage);

  const getScoreColor = (c) => {
    if (c === 'GREEN') return 'text-green-subsidy';
    if (c === 'YELLOW') return 'text-yellow-standard';
    return 'text-red-luxury';
  };

  const getBadgeStyle = (c) => {
    if (c === 'GREEN') return 'bg-green-subsidy/15 text-green-subsidy border-green-subsidy/30';
    if (c === 'YELLOW') return 'bg-yellow-standard/15 text-yellow-standard border-yellow-standard/30';
    return 'bg-red-luxury/15 text-red-luxury border-red-luxury/30';
  };

  return (
    <div className="p-7 max-w-[1440px] mx-auto">
      <div className="mb-7 animate-[fadeIn_0.5s_ease-out]">
        <h2 className="text-2xl font-extrabold text-slate-50 tracking-[-0.5px] mb-1">Account Intelligence</h2>
        <p className="text-[13.5px] text-slate-400">Browse and filter all scored household accounts · {total} total records</p>
      </div>

      <div className="flex items-center gap-2.5 mb-5 flex-wrap animate-[fadeIn_0.5s_ease-out_0.1s_both]">
        <button
          className={`btn-filter ${filter === null ? 'border-cyan-accent text-cyan-accent bg-cyan-accent/20' : ''}`}
          onClick={() => { setFilter(null); setPage(1); }}
        >All ({total})</button>
        {['GREEN', 'YELLOW', 'RED'].map(cls => {
          let activeClass = '';
          if (filter === cls) {
            if (cls === 'GREEN') activeClass = 'border-green-subsidy text-green-subsidy bg-green-subsidy/15';
            else if (cls === 'YELLOW') activeClass = 'border-yellow-standard text-yellow-standard bg-yellow-standard/15';
            else activeClass = 'border-red-luxury text-red-luxury bg-red-luxury/15';
          }
          return (
            <button key={cls} className={`btn-filter ${activeClass}`} onClick={() => { setFilter(cls); setPage(1); }}>{cls}</button>
          );
        })}
      </div>

      <div className="glass-window overflow-hidden animate-[fadeIn_0.5s_ease-out_0.2s_both]">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 text-slate-500">
              <div className="w-9 h-9 border-4 border-glass border-t-cyan-accent rounded-full animate-spin mb-4"></div>
              <div className="text-[13px] font-medium">Loading accounts…</div>
            </div>
          ) : (
            <table className="table-glass">
              <thead>
                <tr>
                  <th>Account Hash</th>
                  <th>County</th>
                  <th>Score</th>
                  <th>Classification</th>
                  <th>Tariff</th>
                  <th>kWh</th>
                  <th>Peak kW</th>
                  <th>Token Avg (KSh)</th>
                  <th>Freq</th>
                  <th>Flags</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.account_id_hash}>
                    <td className="font-mono text-[11px] text-slate-500">{r.account_id_hash.substring(0, 16)}…</td>
                    <td>{r.county}</td>
                    <td className={`font-mono font-bold ${getScoreColor(r.classification)}`}>{r.equity_score.toFixed(1)}</td>
                    <td>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-[0.5px] uppercase border ${getBadgeStyle(r.classification)}`}>
                        {r.classification}
                      </span>
                    </td>
                    <td>{r.suggested_tariff_multiplier}×</td>
                    <td>{r.total_kwh.toFixed(1)}</td>
                    <td>{r.peak_load_kw.toFixed(1)}</td>
                    <td>{r.token_avg_amount.toFixed(0)}</td>
                    <td>{r.token_frequency}/mo</td>
                    <td>
                      {r.flags && r.flags.length > 0 ? (
                        <span className="text-red-luxury text-[11px] font-bold">🚨 {r.flags.join(', ')}</span>
                      ) : (
                        <span className="text-slate-600 text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-5 items-center">
          <button className="btn-filter" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} style={{ opacity: page === 1 ? 0.3 : 1 }}>← Previous</button>
          <span className="text-xs text-slate-400 px-3">Page {page} of {totalPages}</span>
          <button className="btn-filter" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} style={{ opacity: page === totalPages ? 0.3 : 1 }}>Next →</button>
        </div>
      )}
    </div>
  );
}
