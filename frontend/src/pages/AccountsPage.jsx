import { useState, useEffect } from 'react';
import { fetchResults } from '../api/equityApi';

/**
 * Account Intelligence Page — Filterable table of all scored accounts.
 */
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
        const data = await fetchResults({
          page,
          per_page: perPage,
          classification: filter,
        });
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

  const getScoreClass = (classification) => {
    switch (classification) {
      case 'GREEN': return 'green';
      case 'YELLOW': return 'yellow';
      case 'RED': return 'red';
      default: return '';
    }
  };

  return (
    <div className="page-container">
      <div className="page-header fade-in">
        <h2 className="page-title">Account Intelligence</h2>
        <p className="page-subtitle">
          Browse and filter all scored household accounts · {total} total records
        </p>
      </div>

      {/* Filters */}
      <div className="filter-bar fade-in fade-in-delay-1">
        <button
          className={`filter-btn ${filter === null ? 'active' : ''}`}
          onClick={() => { setFilter(null); setPage(1); }}
        >
          All ({total})
        </button>
        {['GREEN', 'YELLOW', 'RED'].map(cls => (
          <button
            key={cls}
            className={`filter-btn ${cls} ${filter === cls ? 'active' : ''}`}
            onClick={() => { setFilter(cls); setPage(1); }}
          >
            {cls}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card fade-in fade-in-delay-2">
        <div className="data-table-wrapper">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <div className="loading-text">Loading accounts…</div>
            </div>
          ) : (
            <table className="data-table" id="accounts-table">
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
                {results.map((r, idx) => (
                  <tr key={r.account_id_hash}>
                    <td className="hash-cell">{r.account_id_hash.substring(0, 16)}…</td>
                    <td>{r.county}</td>
                    <td className={`score-cell ${getScoreClass(r.classification)}`}>
                      {r.equity_score.toFixed(1)}
                    </td>
                    <td>
                      <span className={`classification-badge ${r.classification}`}>
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
                        <span style={{ color: 'var(--red-luxury)', fontSize: '11px', fontWeight: 700 }}>
                          🚨 {r.flags.join(', ')}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--slate-600)', fontSize: '11px' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex', justifyContent: 'center', gap: '8px',
          marginTop: '20px', alignItems: 'center',
        }}>
          <button
            className="filter-btn"
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            style={{ opacity: page === 1 ? 0.3 : 1 }}
          >
            ← Previous
          </button>
          <span style={{ fontSize: '12px', color: 'var(--slate-400)', padding: '0 12px' }}>
            Page {page} of {totalPages}
          </span>
          <button
            className="filter-btn"
            disabled={page === totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            style={{ opacity: page === totalPages ? 0.3 : 1 }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
