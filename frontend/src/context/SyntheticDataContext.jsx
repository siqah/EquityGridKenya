import { createContext, useContext, useMemo } from 'react';
import { generateSyntheticAccounts } from '../data/syntheticGenerator';

const SyntheticDataContext = createContext(null);

function aggregateByCounty(accounts) {
  const m = new Map();
  accounts.forEach((a) => {
    const key = a.county_base || a.county.split('(')[0].trim();
    if (!m.has(key)) {
      m.set(key, {
        total: 0,
        GREEN: 0,
        YELLOW: 0,
        RED: 0,
        scoreSum: 0,
        nspsRegistered: 0,
        leakageScore: 0,
      });
    }
    const row = m.get(key);
    row.total += 1;
    row[a.classification] += 1;
    row.scoreSum += a.final_score;
    if (a.nsps_registered) row.nspsRegistered += 1;
    if (a.classification === 'RED') {
      row.leakageScore += a.final_score * 0.6 + a.kwh_month * 0.85 + a.accounts_same_address * 25;
    }
  });
  return Array.from(m.entries()).map(([name, v]) => {
    const pairs = [
      ['GREEN', v.GREEN],
      ['YELLOW', v.YELLOW],
      ['RED', v.RED],
    ].sort((a, b) => b[1] - a[1]);
    const dominant = pairs[0][1] === 0 ? 'YELLOW' : pairs[0][0];
    return {
      name,
      total: v.total,
      GREEN: v.GREEN,
      YELLOW: v.YELLOW,
      RED: v.RED,
      avg_equity_score: Math.round((v.scoreSum / v.total) * 10) / 10,
      nsps_share_pct: Math.round((v.nspsRegistered / v.total) * 1000) / 10,
      dominant,
      leakageScore: v.leakageScore,
    };
  });
}

function computeKpis(accounts) {
  const greens = accounts.filter((a) => a.classification === 'GREEN');
  const reds = accounts.filter((a) => a.classification === 'RED');
  const yellows = accounts.filter((a) => a.classification === 'YELLOW');

  const subsidyManaged = Math.round(
    greens.reduce(
      (s, a) => s + a.kwh_month * 42 * (1 - 0.6) + a.avg_disconnection_days_per_month * 95,
      0,
    ) * 12,
  );

  const leakageDetected = Math.round(
    reds.reduce(
      (s, a) => s
        + a.kwh_month * 30 * Math.max(0, a.tariff - 1)
        + a.accounts_same_address * 1100
        + (a.has_three_phase ? 2200 : 0),
      0,
    ) * 12,
  );

  const revenueBalance = leakageDetected - subsidyManaged;

  const nspsAmongGreen = greens.filter((g) => g.nsps_registered).length;
  const efficiencyScore = greens.length
    ? Math.min(96, Math.max(38, Math.round((nspsAmongGreen / greens.length) * 100)))
    : 0;

  const countyAgg = aggregateByCounty(accounts);
  const topLeakageCounties = [...countyAgg]
    .sort((a, b) => b.leakageScore - a.leakageScore)
    .slice(0, 5);

  return {
    total_accounts: accounts.length,
    classification_counts: {
      GREEN: greens.length,
      YELLOW: yellows.length,
      RED: reds.length,
    },
    subsidyManaged,
    leakageDetected,
    revenueBalance,
    efficiencyScore,
    countyAgg,
    topLeakageCounties,
    turkana_exceptions: accounts.filter((a) => a.flags?.includes('LUXURY_IN_POVERTY_ZONE')).length,
    counties_covered: new Set(accounts.map((a) => a.county_base || a.county.split('(')[0].trim())).size,
  };
}

export function SyntheticDataProvider({ children }) {
  const accounts = useMemo(() => generateSyntheticAccounts(20260422), []);
  const stats = useMemo(() => computeKpis(accounts), [accounts]);

  const value = useMemo(
    () => ({
      accounts,
      stats,
    }),
    [accounts, stats],
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
