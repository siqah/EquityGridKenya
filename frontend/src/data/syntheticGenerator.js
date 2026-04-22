import { centroidForCounty } from './countyCentroids';

/** KNBS-style county poverty headcount proxy (0–1, higher = more poverty). */
export const POVERTY_BY_COUNTY = {
  Turkana: 0.88,
  Mandera: 0.86,
  Wajir: 0.84,
  Garissa: 0.78,
  Marsabit: 0.76,
  Samburu: 0.72,
  'West Pokot': 0.7,
  Baringo: 0.58,
  Kitui: 0.55,
  Kilifi: 0.52,
  Kwale: 0.5,
  Busia: 0.48,
  Migori: 0.46,
  'Homa Bay': 0.45,
  Kisumu: 0.44,
  Siaya: 0.44,
  Vihiga: 0.42,
  Kakamega: 0.41,
  Bungoma: 0.4,
  Nyamira: 0.38,
  Kisii: 0.37,
  Narok: 0.42,
  Bomet: 0.4,
  Kericho: 0.35,
  Nakuru: 0.32,
  Laikipia: 0.34,
  Meru: 0.36,
  'Tharaka Nithi': 0.39,
  Embu: 0.35,
  Kirinyaga: 0.33,
  'Murang\'a': 0.34,
  Nyeri: 0.3,
  Nyandarua: 0.32,
  Kiambu: 0.28,
  Machakos: 0.38,
  Makueni: 0.42,
  Kajiado: 0.3,
  'Taita Taveta': 0.41,
  Lamu: 0.43,
  Isiolo: 0.55,
  'Elgeyo-Marakwet': 0.48,
  Nandi: 0.4,
  'Uasin Gishu': 0.34,
  'Trans Nzoia': 0.38,
  'Tana River': 0.5,
  Nairobi: 0.17,
  Mombasa: 0.28,
};

const OTHER_COUNTIES = [
  'Kiambu', 'Meru', 'Nyeri', 'Embu', 'Garissa', 'Wajir', 'Baringo', 'Laikipia',
  'Kitui', 'Makueni', 'Kajiado', 'Narok', 'Bomet', 'Kericho', 'Vihiga', 'Bungoma',
  'Busia', 'Siaya', 'Isiolo', 'Samburu', 'Lamu', 'Kwale', 'Kilifi', 'Migori',
  'Nyamira', 'Kisii', 'Nandi', 'Trans Nzoia', 'Elgeyo-Marakwet', 'Tharaka Nithi',
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

function tokenLabelForClass(cls, rng) {
  if (cls === 'GREEN') {
    const opts = ['Daily', 'Every 2 days', 'Every 2–3 days'];
    return opts[randomInt(rng, 0, opts.length - 1)];
  }
  if (cls === 'YELLOW') return 'Weekly';
  return 'Monthly';
}

function buildSignals(cls, rng) {
  const bias = cls === 'RED' ? 1 : cls === 'YELLOW' ? 0.5 : 0;
  const b = () => Math.min(
    100,
    Math.max(0, randomInt(rng, 0, 100) + Math.floor(bias * randomInt(rng, 5, 25))),
  );
  return {
    consumptionPerCapita: b(),
    paymentConsistency: b(),
    peakDemandRatio: b(),
    upgradeHistory: b(),
    consumptionVariance: b(),
    activeAccounts: b(),
    timeOfFirstUsage: b(),
    connectionAge: b(),
  };
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

function tariffFor(cls) {
  if (cls === 'GREEN') return 0.6;
  if (cls === 'YELLOW') return 1.0;
  return 1.4;
}

function povertyIndexForCountyBase(countyBase, rng) {
  const v = POVERTY_BY_COUNTY[countyBase];
  if (v != null) return Math.round(v * 1000) / 1000;
  return Math.round((0.4 + rng() * 0.12) * 1000) / 1000;
}

function buildAccount({
  rng,
  accountHash,
  classification,
  countyBase,
  score,
  kwh_month,
  peak_kw,
  token_avg_ksh,
  token_frequency,
  poverty_index,
  flags,
  ward,
}) {
  const cls = classification;
  const displayCounty = ward ? `${countyBase} (${ward})` : countyBase;
  return {
    account_hash: accountHash,
    county: displayCounty,
    county_base: countyBase,
    ward: ward || null,
    score,
    classification: cls,
    tariff: tariffFor(cls),
    kwh_month,
    peak_kw,
    token_avg_ksh,
    token_frequency,
    token_frequency_label: tokenLabelForClass(cls, rng),
    poverty_index,
    flags: flags || [],
    signals: buildSignals(cls, rng),
    coordinates: centroidForCounty(countyBase),
  };
}

/**
 * 1,000 synthetic households: 420 Green, 355 Yellow, 225 Red (includes 3 fixed demo rows).
 */
export function generateSyntheticAccounts(seed = 20260422) {
  const rng = createRng(seed);
  const accounts = [];
  let seq = 0;

  const nextHash = () => {
    seq += 1;
    const n = String(randomInt(rng, 100000, 999999)).padStart(6, '0');
    return `ACC_${n}`;
  };

  const used = new Set();

  function pushTier(classification, count) {
    for (let i = 0; i < count; i += 1) {
      let hash = nextHash();
      while (used.has(hash)) hash = nextHash();
      used.add(hash);

      const countyBase = countyPicker(rng);
      let score;
      let kwh;
      let peak;
      let token;
      let freq;

      if (classification === 'GREEN') {
        score = randomInt(rng, 0, 40);
        kwh = randomInt(rng, 20, 80);
        peak = Math.round((0.2 + rng() * (0.8 - 0.2)) * 10) / 10;
        token = randomInt(rng, 50, 150);
        freq = randomInt(rng, 12, 30);
      } else if (classification === 'YELLOW') {
        score = randomInt(rng, 41, 70);
        kwh = randomInt(rng, 81, 200);
        peak = Math.round((0.9 + rng() * (2.5 - 0.9)) * 10) / 10;
        token = randomInt(rng, 151, 500);
        freq = randomInt(rng, 4, 10);
      } else {
        score = randomInt(rng, 71, 100);
        kwh = randomInt(rng, 201, 600);
        peak = Math.round((2.6 + rng() * (8.0 - 2.6)) * 10) / 10;
        token = randomInt(rng, 501, 2000);
        freq = randomInt(rng, 1, 3);
      }

      const poverty_index = povertyIndexForCountyBase(countyBase, rng);

      const flags = [];
      if (classification === 'RED') {
        const nFlags = randomInt(rng, 1, 3);
        const pool = [...RED_FLAG_POOL].sort(() => rng() - 0.5);
        flags.push(...pool.slice(0, nFlags));
      }

      accounts.push(
        buildAccount({
          rng,
          accountHash: hash,
          classification,
          countyBase,
          score,
          kwh_month: kwh,
          peak_kw: peak,
          token_avg_ksh: token,
          token_frequency: freq,
          poverty_index,
          flags,
        }),
      );
    }
  }

  pushTier('GREEN', 419);
  pushTier('YELLOW', 355);
  pushTier('RED', 223);

  const demo1 = buildAccount({
    rng,
    accountHash: 'ACC_168669',
    classification: 'RED',
    countyBase: 'Turkana',
    score: 82,
    kwh_month: 340,
    peak_kw: 4.2,
    token_avg_ksh: 1800,
    token_frequency: 2,
    poverty_index: 0.88,
    flags: ['LUXURY_IN_POVERTY_ZONE'],
  });
  demo1.token_frequency_label = 'Monthly';
  demo1.signals = {
    consumptionPerCapita: 88,
    paymentConsistency: 72,
    peakDemandRatio: 91,
    upgradeHistory: 65,
    consumptionVariance: 70,
    activeAccounts: 55,
    timeOfFirstUsage: 48,
    connectionAge: 62,
  };

  const demo2 = buildAccount({
    rng,
    accountHash: 'ACC_004521',
    classification: 'GREEN',
    countyBase: 'Nairobi',
    score: 18,
    kwh_month: 35,
    peak_kw: 0.3,
    token_avg_ksh: 60,
    token_frequency: 26,
    poverty_index: 0.52,
    flags: ['ENERGY_POVERTY_CONFIRMED'],
    ward: 'Kibera',
  });
  demo2.token_frequency_label = 'Daily';
  demo2.signals = {
    consumptionPerCapita: 12,
    paymentConsistency: 22,
    peakDemandRatio: 15,
    upgradeHistory: 10,
    consumptionVariance: 18,
    activeAccounts: 8,
    timeOfFirstUsage: 20,
    connectionAge: 35,
  };

  const demo3 = buildAccount({
    rng,
    accountHash: 'ACC_772301',
    classification: 'RED',
    countyBase: 'Nairobi',
    score: 91,
    kwh_month: 580,
    peak_kw: 7.8,
    token_avg_ksh: 1950,
    token_frequency: 2,
    poverty_index: 0.14,
    flags: ['LUXURY_APPLIANCE_DETECTED', 'MULTI_ACCOUNT_LANDLORD'],
    ward: 'Kilimani',
  });
  demo3.token_frequency_label = 'Monthly';
  demo3.signals = {
    consumptionPerCapita: 94,
    paymentConsistency: 88,
    peakDemandRatio: 96,
    upgradeHistory: 82,
    consumptionVariance: 76,
    activeAccounts: 90,
    timeOfFirstUsage: 70,
    connectionAge: 68,
  };

  accounts.push(demo1, demo2, demo3);

  const byHash = new Map();
  accounts.forEach((a) => byHash.set(a.account_hash, a));
  return Array.from(byHash.values());
}
