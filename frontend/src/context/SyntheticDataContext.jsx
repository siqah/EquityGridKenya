import { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { computeKpis } from '../data/kpiEngine';

const SyntheticDataContext = createContext(null);

export function SyntheticDataProvider({ children }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [weights, setWeights] = useState({
    consumption_per_capita: 0.25,
    payment_consistency: 0.22,
    nsps_status: 0.18,
    peak_demand_ratio: 0.15,
    upgrade_history: 0.12,
    active_accounts: 0.08,
  });

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
            variable_scores: {
              consumption_per_capita: a.score_consumption_per_capita,
              payment_consistency: a.score_payment_consistency,
              nsps_status: a.score_nsps_status,
              peak_demand_ratio: a.score_peak_demand_ratio,
              upgrade_history: a.score_upgrade_history,
              active_accounts: a.score_active_accounts,
            },
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

  const recomputedAccounts = useMemo(() => {
    return accounts.map((a) => {
      const sub = a.variable_scores;
      if (!sub) return a;

      const raw =
        sub.consumption_per_capita * weights.consumption_per_capita +
        sub.payment_consistency * weights.payment_consistency +
        sub.nsps_status * weights.nsps_status +
        sub.peak_demand_ratio * weights.peak_demand_ratio +
        sub.upgrade_history * weights.upgrade_history +
        sub.active_accounts * weights.active_accounts;

      const final_score = Math.round(Math.max(0, Math.min(100, raw)) * 10) / 10;

      let classification = 'YELLOW';
      let tariff = 1.0;
      if (final_score <= 40) {
        classification = 'GREEN';
        tariff = 0.8;
      } else if (final_score <= 70) {
        classification = 'YELLOW';
        tariff = 1.0;
      } else {
        classification = 'RED';
        tariff = 1.25;
      }

      return {
        ...a,
        final_score,
        classification,
        tariff,
      };
    });
  }, [accounts, weights]);

  const stats = useMemo(() => computeKpis(recomputedAccounts), [recomputedAccounts]);

  const value = useMemo(
    () => ({
      accounts: recomputedAccounts,
      rawAccounts: accounts,
      stats,
      weights,
      setWeights,
      loading,
      error,
    }),
    [recomputedAccounts, accounts, stats, weights, loading, error],
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
