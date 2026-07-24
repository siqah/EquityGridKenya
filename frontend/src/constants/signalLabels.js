/** Six model variables — drawer + lookup (scores 0–100 from engine). */
export const SIGNAL_LABELS = [
  {
    key: 'consumption_per_capita',
    title: 'Consumption per capita',
    hint: 'kWh per person vs national vulnerability benchmark.',
  },
  {
    key: 'payment_consistency',
    title: 'Payment consistency',
    hint: 'Fewer disconnection days each month suggests more stable ability to pay.',
  },
  {
    key: 'nsps_status',
    title: 'NSPS status',
    hint: 'Registered social-protection households score as verified vulnerable.',
  },
  {
    key: 'peak_demand_ratio',
    title: 'Peak demand ratio',
    hint: 'Share of energy used in the evening peak window.',
  },
  {
    key: 'upgrade_history',
    title: 'Upgrade history',
    hint: 'Three-phase and high kVA capacity indicate heavier discretionary loads.',
  },
  {
    key: 'active_accounts',
    title: 'Active accounts',
    hint: 'Multiple meters at one address often indicate landlord or estate patterns.',
  },
];

/** Green / amber / red bands from raw 0–100 subscore (same as main equity bar). */
export function tierBarClass(score) {
  const s = Math.min(100, Math.max(0, score));
  if (s <= 40) return 'bg-tier-green';
  if (s <= 70) return 'bg-tier-yellow';
  return 'bg-tier-red';
}

export const LOOKUP_CARDS = [
  {
    key: 'consumption_per_capita',
    title: 'Consumption per capita',
    icon: '👤',
    score: (a) => a.variable_scores?.consumption_per_capita ?? 0,
    line: (a) => {
      const v = a.kwh_per_person ?? a.kwh_month / Math.max(a.ward_avg_household_size, 0.5);
      return `${v.toFixed(1)} kWh per person vs 22 kWh national benchmark`;
    },
  },
  {
    key: 'payment_consistency',
    title: 'Payment consistency',
    icon: '🔌',
    score: (a) => a.variable_scores?.payment_consistency ?? 0,
    line: (a) =>
      `${a.avg_disconnection_days_per_month?.toFixed?.(1) ?? a.avg_disconnection_days_per_month} disconnection days per month detected`,
  },
  {
    key: 'nsps_status',
    title: 'NSPS status',
    icon: '📋',
    score: (a) => a.variable_scores?.nsps_status ?? 0,
    line: (a) =>
      a.nsps_registered
        ? 'Registered government beneficiary'
        : 'Not on social protection register',
  },
  {
    key: 'peak_demand_ratio',
    title: 'Peak demand ratio',
    icon: '📈',
    score: (a) => a.variable_scores?.peak_demand_ratio ?? 0,
    line: (a) =>
      `${Math.round((a.peak_demand_ratio ?? 0) * 100)}% of usage during evening peak hours`,
  },
  {
    key: 'upgrade_history',
    title: 'Upgrade history',
    icon: '⚡',
    score: (a) => a.variable_scores?.upgrade_history ?? 0,
    line: (a) =>
      a.has_three_phase
        ? 'Three-phase connection detected'
        : 'Standard single-phase connection',
  },
  {
    key: 'active_accounts',
    title: 'Active accounts',
    icon: '🏠',
    score: (a) => a.variable_scores?.active_accounts ?? 0,
    line: (a) => `${a.accounts_same_address} meters registered at this address`,
  },
];

export function buildExplanationPrompt(account) {
  const kpp = account.kwh_per_person ?? account.kwh_month / Math.max(account.ward_avg_household_size, 0.5);
  return `
You are an energy equity analyst for EPRA Kenya.
A household account has been scored by the EquityGrid system.

Account details:
- County: ${account.county}
- Classification: ${account.classification}
- Equity Score: ${account.final_score}/100
- Consumption per capita: ${kpp} kWh/person
  (national benchmark: 22 kWh/person)
- Disconnection days per month: ${account.avg_disconnection_days_per_month}
- NSPS registered: ${account.nsps_registered}
- Peak demand ratio: ${account.peak_demand_ratio}
- Three phase connection: ${account.has_three_phase}
- Accounts at same address: ${account.accounts_same_address}

In exactly 2 sentences, explain in plain English why this
household received this classification.
Use simple language a government minister could understand.
Do not use technical jargon.
Do not mention variable names or weights.
Focus on what the data reveals about this household's
actual economic circumstances.
`.trim();
}
