import { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { computeKpis } from '../data/kpiEngine';

const SyntheticDataContext = createContext(null);

export function SyntheticDataProvider({ children }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    fetch('/api/v1/households')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load cohort: ${res.statusText}`);
        }
        return res.json();
      })
      .then((data) => {
        if (active) {
          const mapped = data.map((a) => ({
            ...a,
            account_hash: a.account_id_hash,
            final_score: a.equity_score,
            tariff: a.suggested_tariff_multiplier,
            ward: `Ward ${((a.id || 0) % 5) + 1}`,
          }));
          setAccounts(mapped);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => computeKpis(accounts), [accounts]);

  const value = useMemo(
    () => ({
      accounts,
      stats,
      loading,
      error,
    }),
    [accounts, stats, loading, error],
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-600 font-sans">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-semibold tracking-wide text-primary animate-pulse">
          Connecting to EPRA database...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-tier-red font-sans p-6 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-lg font-bold text-slate-900">Database Connection Offline</h2>
        <p className="mt-2 text-sm text-muted max-w-md">
          {error}. Please ensure the Uvicorn monolithic backend is running at port 8000.
        </p>
      </div>
    );
  }

  return (
    <SyntheticDataContext.Provider value={value}>
      {children}
    </SyntheticDataContext.Provider>
  );
}

export function useSyntheticData() {
  const ctx = useContext(SyntheticDataContext);
  if (!ctx) {
    throw new Error('useSyntheticData must be used within SyntheticDataProvider');
  }
  return ctx;
}
