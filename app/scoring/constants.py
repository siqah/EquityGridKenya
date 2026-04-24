"""
EquityGrid Kenya — Reference data for the six-variable equity model.

NSPS county coverage rates are illustrative priors for non-registered households
(0.0–1.0). Higher coverage means a non-registered status is more unusual.
"""

from __future__ import annotations

# Approximate NSPS programme registration coverage by county (0–1)
COUNTY_NSPS_COVERAGE_RATE: dict[str, float] = {
    "Turkana": 0.22,
    "Mandera": 0.20,
    "Wajir": 0.21,
    "Garissa": 0.28,
    "Marsabit": 0.24,
    "Samburu": 0.26,
    "Isiolo": 0.30,
    "West Pokot": 0.27,
    "Kitui": 0.35,
    "Makueni": 0.36,
    "Kilifi": 0.40,
    "Kwale": 0.38,
    "Nairobi": 0.62,
    "Mombasa": 0.55,
    "Kisumu": 0.48,
    "Nakuru": 0.44,
    "Kakamega": 0.41,
    "Machakos": 0.43,
    "Kiambu": 0.58,
    "Meru": 0.39,
    "Nyeri": 0.42,
    "Embu": 0.37,
    "Bungoma": 0.33,
    "Busia": 0.32,
    "Siaya": 0.31,
    "Narok": 0.29,
    "Bomet": 0.34,
    "Kericho": 0.36,
    "Baringo": 0.28,
    "Laikipia": 0.35,
    "Nyandarua": 0.38,
    "Kajiado": 0.52,
    "Nandi": 0.33,
    "Uasin Gishu": 0.40,
    "Trans Nzoia": 0.35,
    "Elgeyo Marakwet": 0.30,
    "Tharaka Nithi": 0.32,
    "Kirinyaga": 0.41,
    "Murang'a": 0.40,
    "Nyamira": 0.30,
    "Kisii": 0.32,
    "Migori": 0.30,
    "Homa Bay": 0.31,
    "Vihiga": 0.34,
    "Lamu": 0.25,
    "Taita Taveta": 0.33,
    "Tana River": 0.26,
}

DEFAULT_NSPS_COVERAGE_RATE: float = 0.38

# Legacy county poverty index (%) — used only for optional LUXURY_IN_POVERTY_ZONE flag
COUNTY_POVERTY_INDEX: dict[str, float] = {
    "Turkana": 87.5,
    "Mandera": 85.8,
    "Wajir": 84.2,
    "Marsabit": 76.1,
    "Samburu": 75.6,
    "Tana River": 72.9,
    "Garissa": 70.3,
    "Isiolo": 65.8,
    "West Pokot": 66.4,
    "Kilifi": 62.1,
    "Kwale": 60.7,
    "Lamu": 55.2,
    "Taita Taveta": 50.3,
    "Bungoma": 53.4,
    "Kakamega": 49.8,
    "Vihiga": 48.1,
    "Busia": 58.3,
    "Siaya": 47.6,
    "Migori": 46.9,
    "Homa Bay": 48.4,
    "Kisii": 44.5,
    "Nyamira": 43.2,
    "Kisumu": 45.2,
    "Nandi": 38.7,
    "Uasin Gishu": 35.4,
    "Trans Nzoia": 42.1,
    "Elgeyo Marakwet": 40.8,
    "Baringo": 52.7,
    "Laikipia": 36.5,
    "Nyandarua": 33.8,
    "Nyeri": 27.3,
    "Kirinyaga": 25.9,
    "Murang'a": 28.4,
    "Embu": 31.2,
    "Tharaka Nithi": 34.7,
    "Meru": 29.6,
    "Kericho": 32.1,
    "Bomet": 39.4,
    "Narok": 44.7,
    "Kajiado": 30.5,
    "Machakos": 34.2,
    "Makueni": 41.3,
    "Kitui": 55.8,
    "Mombasa": 33.4,
    "Nakuru": 28.7,
    "Kiambu": 22.1,
    "Nairobi": 16.7,
}

HIGH_POVERTY_THRESHOLD_PCT: float = 60.0

DEFAULT_POVERTY_INDEX: float = 50.0

HIGH_POVERTY_COUNTIES: list[str] = [
    c for c, v in COUNTY_POVERTY_INDEX.items() if v >= HIGH_POVERTY_THRESHOLD_PCT
]
