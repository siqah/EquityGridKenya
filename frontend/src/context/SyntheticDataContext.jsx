import { createContext, useContext, useMemo } from 'react';
import { generateSyntheticAccounts } from '../data/syntheticGenerator';

const SyntheticDataContext = createContext(null);

function aggregateByCounty(accounts) {
  const m = new Map();
  accounts.forEach((a) => {
    const key = a.county_base || a.county.split('(')[0].trim();
    if (!m.has(key)) {
      m.set(key, { total: 0, GREEN: 0, YELLOW: 0, RED: 0, povertySum: 0, leakageScore: 0 });
    }
    const row = m.get(key);
    row.total += 1;
    row[a.classification] += 1;
    row.povertySum += a.poverty_index;
    if (a.classification === 'RED') {
      row.leakageScore += a.score * a.kwh_month * 0.01 + a.peak_kw * 50;
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
      poverty_index: Math.round((v.povertySum / v.total) * 1000) / 1000,
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
      (s, a) => s + a.kwh_month * 48 * (1 - 0.6) + Math.max(0, 180 - a.token_avg_ksh) * 6,
      0,
    ) * 12,
  );

  const leakageDetected = Math.round(
    reds.reduce(
      (s, a) =>
        s
        + a.kwh_month * 32 * (a.tariff - 1)
        + a.token_avg_ksh * 8 * (a.tariff - 1)
        + a.peak_kw * 420,
      0,
    ) * 12,
  );

  const revenueBalance = leakageDetected - subsidyManaged;

  const genuinelyVulnerable = greens.filter((g) => g.poverty_index >= 0.35).length;
  const efficiencyScore = greens.length
    ? Math.min(
      96,
      Math.max(
        41,
        Math.round((genuinelyVulnerable / greens.length) * 100),
      ),
    )
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
