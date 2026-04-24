/**
 * Six-variable equity model (mirrors app/scoring/engine.py).
 * Higher final_score → more affluent (RED). Lower → vulnerable (GREEN).
 */

const NATIONAL_BENCHMARK = 22;

const WEIGHTS = {
  consumption_per_capita: 0.25,
  payment_consistency: 0.22,
  nsps_status: 0.18,
  peak_demand_ratio: 0.15,
  upgrade_history: 0.12,
  active_accounts: 0.08,
};

/** Approximate county NSPS coverage priors (0–1). */
export const COUNTY_NSPS_COVERAGE_RATE = {
  Turkana: 0.22,
  Mandera: 0.2,
  Wajir: 0.21,
  Garissa: 0.28,
  Marsabit: 0.24,
  Samburu: 0.26,
  Isiolo: 0.3,
  'West Pokot': 0.27,
  Kitui: 0.35,
  Makueni: 0.36,
  Kilifi: 0.4,
  Kwale: 0.38,
  Nairobi: 0.62,
  Mombasa: 0.55,
  Kisumu: 0.48,
  Nakuru: 0.44,
  Kakamega: 0.41,
  Machakos: 0.43,
  Kiambu: 0.58,
  Meru: 0.39,
  Nyeri: 0.42,
  Embu: 0.37,
  Bungoma: 0.33,
  Busia: 0.32,
  Siaya: 0.31,
  Narok: 0.29,
  Bomet: 0.34,
  Kericho: 0.36,
  Baringo: 0.28,
  Laikipia: 0.35,
  Nyandarua: 0.38,
  Kajiado: 0.52,
  Nandi: 0.33,
  'Uasin Gishu': 0.4,
  'Trans Nzoia': 0.35,
  'Elgeyo Marakwet': 0.3,
  'Tharaka Nithi': 0.32,
  Kirinyaga: 0.41,
  "Murang'a": 0.4,
  Nyamira: 0.3,
  Kisii: 0.32,
  Migori: 0.3,
  'Homa Bay': 0.31,
  Vihiga: 0.34,
  Lamu: 0.25,
  'Taita Taveta': 0.33,
  'Tana River': 0.26,
};

const DEFAULT_NSPS = 0.38;

/** Counties treated as ASAL / arid for NSPS registration priors among GREEN. */
const ARID_COUNTIES = new Set([
  'Turkana', 'Mandera', 'Wajir', 'Garissa', 'Marsabit', 'Samburu', 'Isiolo',
  'West Pokot', 'Baringo', 'Kitui', 'Makueni', 'Tana River', 'Lamu',
]);

const URBAN_MAJOR = new Set(['Nairobi', 'Mombasa', 'Kisumu']);

const HIGH_POVERTY = new Set([
  'Turkana', 'Mandera', 'Wajir', 'Marsabit', 'Samburu', 'Garissa', 'Isiolo',
  'West Pokot', 'Kitui', 'Kilifi', 'Kwale', 'Busia', 'Bungoma',
]);

function clamp(v, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

export function defaultNspsCoverageForCounty(countyBase) {
  const k = (countyBase || '').trim();
  return COUNTY_NSPS_COVERAGE_RATE[k] ?? DEFAULT_NSPS;
}

function computeSubscores(a) {
  const w = Math.max(a.ward_avg_household_size, 0.5);
  const kwhPerPerson = a.kwh_month / w;
  const capitaScore = clamp((kwhPerPerson / NATIONAL_BENCHMARK) * 33);

  const disco = a.avg_disconnection_days_per_month;
  const consistencyScore = clamp(100 - disco * 15);

  let nspsScore;
  if (a.nsps_registered) nspsScore = 0;
  else {
    const rate = clamp(a.county_nsps_coverage_rate, 0, 1);
    nspsScore = clamp(50 + rate * 50);
  }

  const pr = clamp(a.peak_demand_ratio, 0, 1);
  const peakScore = clamp(100 - pr * 120);

  let upgradeScore;
  if (a.has_three_phase) upgradeScore = 100;
  else if (a.connection_capacity_kva > 5) upgradeScore = 70;
  else upgradeScore = 10;

  let accountsScore;
  if (a.accounts_same_address >= 3) accountsScore = 100;
  else if (a.accounts_same_address === 2) accountsScore = 60;
  else accountsScore = 0;

  return {
    consumption_per_capita: Math.round(capitaScore * 10) / 10,
    payment_consistency: Math.round(consistencyScore * 10) / 10,
    nsps_status: Math.round(nspsScore * 10) / 10,
    peak_demand_ratio: Math.round(peakScore * 10) / 10,
    upgrade_history: Math.round(upgradeScore * 10) / 10,
    active_accounts: Math.round(accountsScore * 10) / 10,
  };
}

function weightedFinal(vs) {
  let s = 0;
  Object.keys(WEIGHTS).forEach((k) => {
    s += vs[k] * WEIGHTS[k];
  });
  return Math.round(clamp(s) * 10) / 10;
}

function classify(final) {
  if (final <= 40) return { classification: 'GREEN', tariff_multiplier: 0.6 };
  if (final <= 70) return { classification: 'YELLOW', tariff_multiplier: 1.0 };
  return { classification: 'RED', tariff_multiplier: 1.4 };
}

function luxuryPovertyFlag(countyBase, classification, a, finalScore) {
  if (classification !== 'RED') return [];
  const bench = NATIONAL_BENCHMARK;
  const kwhpp = a.kwh_month / Math.max(a.ward_avg_household_size, 0.5);
  if (HIGH_POVERTY.has(countyBase) && kwhpp > bench * 1.25) {
    return ['LUXURY_IN_POVERTY_ZONE'];
  }
  return [];
}

/**
 * @param {object} a — account input fields (county_base for flags; county for display)
 */
export function computeEquityFromInputs(a) {
  const countyBase = a.county_base || a.county.split('(')[0].trim();
  const vs = computeSubscores(a);
  const final_score = weightedFinal(vs);
  const { classification, tariff_multiplier } = classify(final_score);
  const autoFlags = luxuryPovertyFlag(countyBase, classification, a, final_score);
  const uniq = [...new Set([...(a.flags_preset || []), ...autoFlags])];
  return {
    final_score,
    classification,
    tariff_multiplier,
    variable_scores: vs,
    flags: uniq,
    kwh_per_person: Math.round((a.kwh_month / Math.max(a.ward_avg_household_size, 0.5)) * 10) / 10,
  };
}

export { ARID_COUNTIES, URBAN_MAJOR, NATIONAL_BENCHMARK };
