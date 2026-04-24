/** Plain-English labels for the eight model signals shown in the account drawer. */
export const SIGNAL_LABELS = [
  {
    key: 'consumptionPerCapita',
    title: 'Consumption per capita',
    hint: 'Monthly kWh divided by estimated household size — compares to national benchmarks.',
  },
  {
    key: 'paymentConsistency',
    title: 'Payment consistency',
    hint: 'How regular token purchases are versus expected patterns for the declared income band.',
  },
  {
    key: 'peakDemandRatio',
    title: 'Peak demand ratio',
    hint: 'Evening or short spikes versus average load — high-draw appliances often spike harder.',
  },
  {
    key: 'upgradeHistory',
    title: 'Upgrade history',
    hint: 'Service upgrades such as three-phase connections that typically follow rising capacity needs.',
  },
  {
    key: 'consumptionVariance',
    title: 'Consumption variance',
    hint: 'Month-to-month stability — artificial “threshold gaming” often shows unusually flat bands.',
  },
  {
    key: 'activeAccounts',
    title: 'Linked active accounts',
    hint: 'Other meters tied to the same payer or premise cluster — useful for landlord or estate patterns.',
  },
  {
    key: 'timeOfFirstUsage',
    title: 'Time-of-use profile',
    hint: 'When energy is drawn across the day — commercial or heavy appliance loads look different.',
  },
  {
    key: 'connectionAge',
    title: 'Connection age',
    hint: 'Years on supply — long tenure with sudden jumps can indicate retrofitting or sub-metering.',
  },
];

export const LOOKUP_SIGNAL_GROUPS = [
  {
    key: 'geographic',
    title: 'Geographic score',
    icon: '🗺️',
    score: (a) => Math.round((1 - a.baseline_index) * 40 + (a.classification === 'RED' ? 35 : 20)),
    summary: (a) =>
      `${a.county} sits at baseline index ${a.baseline_index.toFixed(2)} — geography ${a.baseline_index >= 0.55 ? 'supports subsidy eligibility' : 'suggests a relatively better-resourced area'}.`,
  },
  {
    key: 'appliance',
    title: 'Appliance fingerprint',
    icon: '⚡',
    score: (a) => Math.min(100, Math.round(a.peak_kw * 11 + a.kwh_month * 0.08)),
    summary: (a) =>
      `Peak ${a.peak_kw} kW vs ${a.kwh_month} kWh/month implies ${a.peak_kw > 3 ? 'heavy or simultaneous appliance draw' : 'typical residential baseload patterns'}.`,
  },
  {
    key: 'token',
    title: 'Token pattern',
    icon: '💳',
    score: (a) =>
      Math.min(
        100,
        Math.round(a.token_avg_ksh / 25 + (a.token_frequency >= 12 ? 15 : a.token_frequency >= 4 ? 45 : 70)),
      ),
    summary: (a) =>
      `Average purchase KSh ${a.token_avg_ksh} with ${a.token_frequency_label?.toLowerCase() || 'mixed'} cadence — ${a.token_avg_ksh > 900 ? 'consistent high liquidity' : 'consistent constrained purchasing'}.`,
  },
];
