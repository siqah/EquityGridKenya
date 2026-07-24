/** KNBS-style illustrative county poverty headcount index (%) — for map tooltips only. */
export const COUNTY_POVERTY_INDEX = {
  Turkana: 87.5,
  Mandera: 85.8,
  Wajir: 84.2,
  Marsabit: 76.1,
  Samburu: 75.6,
  'Tana River': 72.9,
  Garissa: 70.3,
  Isiolo: 65.8,
  'West Pokot': 66.4,
  Kilifi: 62.1,
  Kwale: 60.7,
  Lamu: 55.2,
  'Taita Taveta': 50.3,
  Bungoma: 53.4,
  Kakamega: 49.8,
  Vihiga: 48.1,
  Busia: 58.3,
  Siaya: 47.6,
  Migori: 46.9,
  'Homa Bay': 48.4,
  Kisii: 44.5,
  Nyamira: 43.2,
  Kisumu: 45.2,
  Nandi: 38.7,
  'Uasin Gishu': 35.4,
  'Trans Nzoia': 42.1,
  'Elgeyo Marakwet': 40.8,
  Baringo: 52.7,
  Laikipia: 36.5,
  Nyandarua: 33.8,
  Nyeri: 27.3,
  Kirinyaga: 25.9,
  "Murang'a": 28.4,
  Embu: 31.2,
  'Tharaka Nithi': 34.7,
  Meru: 29.6,
  Kericho: 32.1,
  Bomet: 39.4,
  Narok: 44.7,
  Kajiado: 30.5,
  Machakos: 34.2,
  Makueni: 41.3,
  Kitui: 55.8,
  Mombasa: 33.4,
  Nakuru: 28.7,
  Kiambu: 22.1,
  Nairobi: 16.7,
};

export const DEFAULT_POVERTY_INDEX = 50;

export function povertyIndexForCounty(name) {
  if (!name) return DEFAULT_POVERTY_INDEX;
  const k = name.trim();
  if (COUNTY_POVERTY_INDEX[k] != null) return COUNTY_POVERTY_INDEX[k];
  const titled = k
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
  return COUNTY_POVERTY_INDEX[titled] ?? DEFAULT_POVERTY_INDEX;
}
