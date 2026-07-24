import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageFade from '../components/Layout/PageFade';
import { useSyntheticData } from '../context/SyntheticDataContext';
import { SIGNAL_LABELS, tierBarClass } from '../constants/signalLabels';

function scoreColor(cls) {
  if (cls === 'GREEN') return 'text-tier-green';
  if (cls === 'YELLOW') return 'text-tier-yellow';
  return 'text-tier-red';
}

function pillClass(cls) {
  if (cls === 'GREEN') return 'bg-emerald-50 text-tier-green border-emerald-200';
  if (cls === 'YELLOW') return 'bg-amber-50 text-tier-yellow border-amber-200';
  return 'bg-red-50 text-tier-red border-red-200';
}

function AccountDrawer({ account, onClose }) {
  if (!account) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/30" aria-label="Close" onClick={onClose} />
      <aside className="relative w-full max-w-md h-full bg-surface border-l border-border shadow-xl overflow-y-auto animate-fade-in">
        <div className="p-5 border-b border-border flex items-start justify-between gap-3">
          <div>
            <div className="text-xs text-muted uppercase tracking-wide">Account</div>
            <div className="font-mono text-lg font-bold text-primary">{account.account_hash}</div>
            <div className="text-sm text-muted mt-1">{account.county}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-9 h-9 rounded-lg border border-border text-muted hover:text-body"
            aria-label="Close drawer"
          >
            ✕
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex flex-wrap gap-2 text-xs">
            <span className={`px-2.5 py-1 rounded-full border font-semibold ${pillClass(account.classification)}`}>
              {account.classification}
            </span>
            <span className="px-2.5 py-1 rounded-full border border-border text-body font-semibold">
              Tariff {account.tariff}×
            </span>
            <span className={`px-2.5 py-1 rounded-full border font-mono font-bold ${scoreColor(account.classification)}`}>
              Score {account.final_score}
            </span>
          </div>
          <Link
            to={`/household/${encodeURIComponent(account.account_hash)}`}
            onClick={onClose}
            className="inline-flex w-full justify-center px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 shadow-sm"
          >
            View Household Report
          </Link>
          <div className="text-sm text-body space-y-1">
            <div>
              <span className="text-muted">Urban / rural:</span>{' '}
              <span className="font-semibold">{account.urban_rural_classification}</span>
            </div>
            <div>
              <span className="text-muted">kWh / month:</span>{' '}
              <span className="font-semibold">{account.kwh_month}</span>
            </div>
            <div>
              <span className="text-muted">Disconnection days / month:</span>{' '}
              <span className="font-semibold">{account.avg_disconnection_days_per_month}</span>
            </div>
            <div>
              <span className="text-muted">NSPS registered:</span>{' '}
              <span className="font-semibold">{account.nsps_registered ? 'Yes' : 'No'}</span>
            </div>
            <div>
              <span className="text-muted">Peak demand ratio:</span>{' '}
              <span className="font-semibold">{account.peak_demand_ratio}</span>
            </div>
            <div>
              <span className="text-muted">Three-phase:</span>{' '}
              <span className="font-semibold">{account.has_three_phase ? 'Yes' : 'No'}</span>
            </div>
            <div>
              <span className="text-muted">Connection kVA:</span>{' '}
              <span className="font-semibold">{account.connection_capacity_kva}</span>
            </div>
            <div>
              <span className="text-muted">Meters at address:</span>{' '}
              <span className="font-semibold">{account.accounts_same_address}</span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-primary mb-3">Six scoring variables (0–100)</h3>
            <div className="space-y-3">
              {SIGNAL_LABELS.map((sig) => {
                const val = account.variable_scores?.[sig.key] ?? 0;
                return (
                  <div key={sig.key}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-body">{sig.title}</span>
                      <span className="font-mono text-muted">{val}</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-muted border border-border overflow-hidden">
                      <div
                        className={`h-full rounded-full ${tierBarClass(val)}`}
                        style={{ width: `${val}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-muted mt-1 leading-snug">{sig.hint}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default function AccountsPage() {
  const { accounts, stats } = useSyntheticData();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState(null);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);
  const perPage = 20;

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return accounts.filter((a) => {
      if (filter && a.classification !== filter) return false;
      if (!qq) return true;
      return (
        a.account_hash.toLowerCase().includes(qq)
        || a.county.toLowerCase().includes(qq)
        || (a.county_base && a.county_base.toLowerCase().includes(qq))
      );
    });
  }, [accounts, filter, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage);

  const counts = stats.classification_counts;

  return (
    <PageFade className="p-5 md:p-8 max-w-[1440px] mx-auto">
      <section className="mb-6 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="page-kicker">Household register</p>
          <h2 className="page-title mt-1">Account intelligence</h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted">
            Review the live synthetic cohort, investigate outliers, and open an account scorecard for its full equity signal profile.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm shadow-sm">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">Cohort size</span>
          <span className="font-mono text-base font-bold text-primary">{accounts.length.toLocaleString()}</span>
          <span className="ml-1 text-xs text-muted">households</span>
        </div>
      </section>

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className="relative block w-full md:max-w-md">
          <span className="sr-only">Search accounts</span>
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted" aria-hidden>⌕</span>
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search account hash or county"
            className="control-input pl-9"
          />
        </label>
        <div className="text-sm text-muted">
          <span className="font-semibold text-body">{filtered.length.toLocaleString()}</span> matching accounts
        </div>
      </div>

      <div className="segmented-control mb-4 max-w-full overflow-x-auto">
        <button
          type="button"
          className={`btn-filter whitespace-nowrap border-transparent bg-transparent ${filter === null ? '!border-primary !text-primary !bg-white shadow-sm' : ''}`}
          onClick={() => {
            setFilter(null);
            setPage(1);
          }}
        >
          All ({counts.GREEN + counts.YELLOW + counts.RED})
        </button>
        {['GREEN', 'YELLOW', 'RED'].map((cls) => (
          <button
            key={cls}
            type="button"
            className={`btn-filter whitespace-nowrap border-transparent bg-transparent ${filter === cls ? '!border-primary !text-primary !bg-white shadow-sm' : ''}`}
            onClick={() => {
              setFilter(cls);
              setPage(1);
            }}
          >
            {cls} ({counts[cls]})
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          {pageRows.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted">
              No accounts match your search. Try clearing the search box or switching the classification tab.
            </div>
          ) : (
            <table className="table-pro min-w-[960px]">
              <thead>
                <tr>
                  <th>Account hash</th>
                  <th>County</th>
                  <th>Urban / rural</th>
                  <th>Score</th>
                  <th>Class</th>
                  <th>Tariff</th>
                  <th>kWh</th>
                  <th>Disc. days</th>
                  <th>Peak ratio</th>
                  <th>Flags</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
                  <tr
                    key={r.account_hash}
                    className="cursor-pointer"
                    onClick={() => setSelected(r)}
                  >
                    <td className="font-mono text-xs text-body font-semibold">{r.account_hash}</td>
                    <td className="text-sm max-w-[200px] truncate">{r.county}</td>
                    <td className="text-xs text-muted">{r.urban_rural_classification}</td>
                    <td className={`font-mono font-bold ${scoreColor(r.classification)}`}>{r.final_score}</td>
                    <td>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${pillClass(r.classification)}`}>
                        {r.classification}
                      </span>
                    </td>
                    <td className="text-sm font-semibold">{r.tariff}×</td>
                    <td className="text-sm">{r.kwh_month}</td>
                    <td className="text-sm">{r.avg_disconnection_days_per_month}</td>
                    <td className="text-sm font-mono">{r.peak_demand_ratio}</td>
                    <td>
                      {r.flags?.length ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-tier-red border border-red-200">
                          {r.flags.length} flag{r.flags.length > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-xs text-muted">—</span>
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
        <div className="flex justify-center gap-2 mt-5 items-center text-sm text-muted">
          <button
            type="button"
            className="btn-filter"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Previous
          </button>
          <span className="px-3">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="btn-filter"
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next →
          </button>
        </div>
      )}

      {selected && <AccountDrawer account={selected} onClose={() => setSelected(null)} />}
    </PageFade>
  );
}
