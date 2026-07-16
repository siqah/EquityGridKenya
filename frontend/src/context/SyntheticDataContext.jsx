import { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react';
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

  const refresh = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/households', { signal });
      if (!res.ok) {
        throw new Error(`The household cohort could not be loaded (${res.status}).`);
      }
      const data = await res.json();
      if (signal?.aborted) return;
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
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message || 'The household cohort could not be loaded.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

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
      refresh,
    }),
    [recomputedAccounts, accounts, stats, weights, loading, error, refresh],
  );

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
