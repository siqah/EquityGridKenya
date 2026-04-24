import { centroidForCounty } from './countyCentroids';
import {
  computeEquityFromInputs,
  defaultNspsCoverageForCounty,
  ARID_COUNTIES,
  URBAN_MAJOR,
} from './equityScoring';

const OTHER_COUNTIES = [
  'Kiambu', 'Meru', 'Nyeri', 'Embu', 'Garissa', 'Wajir', 'Baringo', 'Laikipia',
  'Kitui', 'Makueni', 'Kajiado', 'Narok', 'Bomet', 'Kericho', 'Vihiga', 'Bungoma',
  'Busia', 'Siaya', 'Isiolo', 'Samburu', 'Lamu', 'Kwale', 'Kilifi', 'Migori',
  'Nyamira', 'Kisii', 'Nandi', 'Trans Nzoia', 'Elgeyo Marakwet', 'Tharaka Nithi',
];

const RED_FLAG_POOL = [
  'LUXURY_APPLIANCE_DETECTED',
  'LANDLORD_PATTERN',
  'THRESHOLD_GAMING',
  'UPGRADE_HISTORY',
];

function createRng(seed = 42) {
  let s = Math.floor(seed) % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function pickWeighted(rng, items) {
  const total = items.reduce((a, b) => a + b.w, 0);
  let r = rng() * total;
  for (const it of items) {
    r -= it.w;
    if (r <= 0) return it.v;
  }
  return items[items.length - 1].v;
}

function randomInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function countyPicker(rng) {
  return pickWeighted(rng, [
    { v: 'Nairobi', w: 300 },
    { v: 'Mombasa', w: 120 },
    { v: 'Kisumu', w: 100 },
    { v: 'Nakuru', w: 80 },
    { v: 'Turkana', w: 60 },
    { v: 'Kakamega', w: 50 },
    { v: 'Machakos', w: 50 },
    ...OTHER_COUNTIES.map((c) => ({ v: c, w: 240 / OTHER_COUNTIES.length })),
  ]);
}

function urbanRuralPick(rng, countyBase) {
  if (URBAN_MAJOR.has(countyBase)) {
    const u = rng();
    if (u < 0.55) return 'Urban';
    if (u < 0.85) return 'Peri-urban';
    return 'Rural';
  }
  const u = rng();
  if (u < 0.2) return 'Urban';
  if (u < 0.45) return 'Peri-urban';
  return 'Rural';
}

function nspsForTier(rng, tier, countyBase) {
  if (tier === 'RED') return false;
  if (tier === 'GREEN') {
    if (ARID_COUNTIES.has(countyBase)) return rng() < 0.35;
    if (URBAN_MAJOR.has(countyBase)) return rng() < 0.08;
    return rng() < 0.2;
  }
  // YELLOW
  return rng() < 0.15;
}

function sampleInputsForTier(rng, tier, countyBase) {
  const ward_avg_household_size = Math.round((2.1 + rng() * (6.8 - 2.1)) * 10) / 10;
  let avg_disconnection_days_per_month;
  let peak_demand_ratio;
  let kwh_month;
  let has_three_phase;
  let connection_capacity_kva;
  let accounts_same_address;

  if (tier === 'GREEN') {
    avg_disconnection_days_per_month = randomInt(rng, 4, 12);
    peak_demand_ratio = Math.round((0.65 + rng() * (0.9 - 0.65)) * 100) / 100;
    kwh_month = randomInt(rng, 18, 95);
    has_three_phase = false;
    connection_capacity_kva = Math.round((2 + rng() * 2.8) * 10) / 10;
    accounts_same_address = 1;
  } else if (tier === 'YELLOW') {
    avg_disconnection_days_per_month = randomInt(rng, 1, 3);
    peak_demand_ratio = Math.round((0.4 + rng() * (0.64 - 0.4)) * 100) / 100;
    kwh_month = randomInt(rng, 75, 210);
    has_three_phase = rng() < 0.05;
    connection_capacity_kva = has_three_phase
      ? Math.round((6 + rng() * 10) * 10) / 10
      : Math.round((2.5 + rng() * 3.5) * 10) / 10;
    accounts_same_address = rng() < 0.65 ? 1 : 2;
  } else {
    avg_disconnection_days_per_month = 0;
    peak_demand_ratio = Math.round((0.1 + rng() * (0.39 - 0.1)) * 100) / 100;
    kwh_month = randomInt(rng, 200, 620);
    has_three_phase = rng() < 0.4;
    connection_capacity_kva = has_three_phase
      ? Math.round((12 + rng() * 28) * 10) / 10
      : Math.round((5 + rng() * 10) * 10) / 10;
    accounts_same_address = randomInt(rng, 1, 4);
  }

  const nsps_registered = nspsForTier(rng, tier, countyBase);
  const county_nsps_coverage_rate = defaultNspsCoverageForCounty(countyBase);
  const urban_rural_classification = urbanRuralPick(rng, countyBase);

  return {
    ward_avg_household_size,
    kwh_month,
    avg_disconnection_days_per_month,
    nsps_registered,
    county_nsps_coverage_rate,
    peak_demand_ratio,
    has_three_phase,
    connection_capacity_kva,
    accounts_same_address,
    urban_rural_classification,
  };
}

function buildRow(rng, accountHash, countyBase, ward, tier, flagsPreset = []) {
  let inputs = sampleInputsForTier(rng, tier, countyBase);
  let out = computeEquityFromInputs({
    county: ward ? `${countyBase} (${ward})` : countyBase,
    county_base: countyBase,
    ward: ward || null,
    ...inputs,
    flags_preset: flagsPreset,
  });
  for (let t = 0; t < 60 && out.classification !== tier; t += 1) {
    inputs = sampleInputsForTier(rng, tier, countyBase);
    out = computeEquityFromInputs({
      county: ward ? `${countyBase} (${ward})` : countyBase,
      county_base: countyBase,
      ward: ward || null,
      ...inputs,
      flags_preset: flagsPreset,
    });
  }
  const displayCounty = ward ? `${countyBase} (${ward})` : countyBase;
  return {
    account_hash: accountHash,
    county: displayCounty,
    county_base: countyBase,
    ward: ward || null,
    urban_rural_classification: inputs.urban_rural_classification,
    ward_avg_household_size: inputs.ward_avg_household_size,
    kwh_month: inputs.kwh_month,
    avg_disconnection_days_per_month: inputs.avg_disconnection_days_per_month,
    nsps_registered: inputs.nsps_registered,
    county_nsps_coverage_rate: inputs.county_nsps_coverage_rate,
    peak_demand_ratio: inputs.peak_demand_ratio,
    has_three_phase: inputs.has_three_phase,
    connection_capacity_kva: inputs.connection_capacity_kva,
    accounts_same_address: inputs.accounts_same_address,
    final_score: out.final_score,
    classification: out.classification,
    tariff: out.tariff_multiplier,
    variable_scores: out.variable_scores,
    flags:
      out.flags.length > 0
        ? out.flags
        : tier === 'RED'
          ? pickRedFlags(rng)
          : [],
    kwh_per_person: out.kwh_per_person,
    coordinates: centroidForCounty(countyBase),
  };
}

function pickRedFlags(rng) {
  const n = randomInt(rng, 1, 2);
  return [...RED_FLAG_POOL].sort(() => rng() - 0.5).slice(0, n);
}

/**
 * 1,000 synthetic households (420 GREEN / 355 YELLOW / 225 RED) + 3 demos.
 * Only the six-variable input fields above are stored per account (plus derived scores).
 */
export function generateSyntheticAccounts(seed = 20260422) {
  const rng = createRng(seed);
  const used = new Set();

  const nextHash = () => {
    let h;
    do {
      h = `ACC_${String(randomInt(rng, 100000, 999999)).padStart(6, '0')}`;
    } while (used.has(h));
    used.add(h);
    return h;
  };

  const accounts = [];

  function pushTier(tier, count) {
    for (let i = 0; i < count; i += 1) {
      const countyBase = countyPicker(rng);
      accounts.push(buildRow(rng, nextHash(), countyBase, null, tier));
    }
  }

  pushTier('GREEN', 419);
  pushTier('YELLOW', 355);
  pushTier('RED', 223);

  function pushDemo(accountHash, displayCounty, countyBase, ward, fields, flagsPreset) {
    const o = computeEquityFromInputs({
      county: displayCounty,
      county_base: countyBase,
      ward_avg_household_size: fields.ward_avg_household_size,
      kwh_month: fields.kwh_month,
      avg_disconnection_days_per_month: fields.avg_disconnection_days_per_month,
      nsps_registered: fields.nsps_registered,
      county_nsps_coverage_rate: fields.county_nsps_coverage_rate,
      peak_demand_ratio: fields.peak_demand_ratio,
      has_three_phase: fields.has_three_phase,
      connection_capacity_kva: fields.connection_capacity_kva,
      accounts_same_address: fields.accounts_same_address,
      flags_preset: flagsPreset,
    });
    accounts.push({
      account_hash: accountHash,
      county: displayCounty,
      county_base: countyBase,
      ward,
      urban_rural_classification: fields.urban_rural_classification,
      ward_avg_household_size: fields.ward_avg_household_size,
      kwh_month: fields.kwh_month,
      avg_disconnection_days_per_month: fields.avg_disconnection_days_per_month,
      nsps_registered: fields.nsps_registered,
      county_nsps_coverage_rate: fields.county_nsps_coverage_rate,
      peak_demand_ratio: fields.peak_demand_ratio,
      has_three_phase: fields.has_three_phase,
      connection_capacity_kva: fields.connection_capacity_kva,
      accounts_same_address: fields.accounts_same_address,
      final_score: o.final_score,
      classification: o.classification,
      tariff: o.tariff_multiplier,
      variable_scores: o.variable_scores,
      flags: o.flags,
      kwh_per_person: o.kwh_per_person,
      coordinates: centroidForCounty(countyBase),
    });
  }

  pushDemo(
    'ACC_168669',
    'Turkana',
    'Turkana',
    null,
    {
      ward_avg_household_size: 5.2,
      kwh_month: 340,
      avg_disconnection_days_per_month: 0,
      nsps_registered: false,
      county_nsps_coverage_rate: defaultNspsCoverageForCounty('Turkana'),
      peak_demand_ratio: 0.18,
      has_three_phase: true,
      connection_capacity_kva: 15,
      accounts_same_address: 2,
      urban_rural_classification: 'Rural',
    },
    [],
  );

  pushDemo(
    'ACC_004521',
    'Nairobi (Kibera)',
    'Nairobi',
    'Kibera',
    {
      ward_avg_household_size: 5.8,
      kwh_month: 35,
      avg_disconnection_days_per_month: 9,
      nsps_registered: true,
      county_nsps_coverage_rate: defaultNspsCoverageForCounty('Nairobi'),
      peak_demand_ratio: 0.82,
      has_three_phase: false,
      connection_capacity_kva: 3.5,
      accounts_same_address: 1,
      urban_rural_classification: 'Urban',
    },
    [],
  );

  pushDemo(
    'ACC_772301',
    'Nairobi (Kilimani)',
    'Nairobi',
    'Kilimani',
    {
      ward_avg_household_size: 2.1,
      kwh_month: 580,
      avg_disconnection_days_per_month: 0,
      nsps_registered: false,
      county_nsps_coverage_rate: defaultNspsCoverageForCounty('Nairobi'),
      peak_demand_ratio: 0.12,
      has_three_phase: true,
      connection_capacity_kva: 25,
      accounts_same_address: 4,
      urban_rural_classification: 'Urban',
    },
    [],
  );

  const byHash = new Map();
  accounts.forEach((a) => byHash.set(a.account_hash, a));
  return Array.from(byHash.values());
}
