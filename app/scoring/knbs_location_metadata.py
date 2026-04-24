"""
KNBS-linked location bands for Variable 2 (Location Type).

Sub-county / ward-sector labels and urbanisation class follow the spirit of
KNBS 2019 Census Volume II (Population and Household Distribution by
Sex, Number of Households, Land Area, Population Density and Sub-Location)
— ward-level density informs whether an area is treated as urban,
peri-urban, or rural in the scoring engine.

The runtime classifier does **not** store raw coordinates: it hashes
quantised coordinates with a server pepper and uses the digest to pick
one band from this county-specific ordered list (deterministic, privacy
preserving). When coordinates are absent, a county aggregate fallback is used.
"""

from __future__ import annotations

from app.scoring.constants import COUNTY_POVERTY_INDEX, DEFAULT_POVERTY_INDEX

# Ordered bands: (sub_county_or_ward_sector_label, location_type)
# location_type must be one of: "urban", "peri-urban", "rural"
COUNTY_SUBCOUNTY_LOCATION_BANDS: dict[str, list[tuple[str, str]]] = {
    "Nairobi": [
        ("Westlands", "urban"),
        ("Starehe", "urban"),
        ("Dagoretti North", "urban"),
        ("Kasarani", "urban"),
        ("Embakasi Central", "urban"),
        ("Langata", "peri-urban"),
        ("Roysambu", "peri-urban"),
        ("Kibra", "peri-urban"),
        ("Dagoretti South", "peri-urban"),
        ("Mathare", "urban"),
    ],
    "Mombasa": [
        ("Mvita", "urban"),
        ("Nyali", "urban"),
        ("Kisauni", "peri-urban"),
        ("Likoni", "peri-urban"),
        ("Changamwe", "urban"),
        ("Jomvu", "peri-urban"),
    ],
    "Kisumu": [
        ("Kisumu Central", "urban"),
        ("Kisumu East", "urban"),
        ("Seme", "rural"),
        ("Nyando", "rural"),
        ("Muhoroni", "peri-urban"),
        ("Nyakach", "rural"),
    ],
    "Nakuru": [
        ("Nakuru Town West", "urban"),
        ("Nakuru Town East", "urban"),
        ("Gilgil", "peri-urban"),
        ("Naivasha", "peri-urban"),
        ("Subukia", "rural"),
        ("Rongai", "rural"),
        ("Molo", "rural"),
    ],
    "Kiambu": [
        ("Thika Town", "urban"),
        ("Ruiru", "peri-urban"),
        ("Juja", "peri-urban"),
        ("Limuru", "peri-urban"),
        ("Gatundu North", "rural"),
        ("Lari", "rural"),
        ("Githunguri", "rural"),
    ],
    "Machakos": [
        ("Machakos Town", "urban"),
        ("Athi River", "peri-urban"),
        ("Mavoko", "peri-urban"),
        ("Kangundo", "rural"),
        ("Matungulu", "rural"),
        ("Mwala", "rural"),
    ],
    "Turkana": [
        ("Turkana Central", "rural"),
        ("Turkana North", "rural"),
        ("Turkana South", "rural"),
        ("Loima", "rural"),
        ("Kibish", "rural"),
        ("Turkana West", "rural"),
    ],
    "Mandera": [
        ("Mandera East", "peri-urban"),
        ("Mandera West", "rural"),
        ("Banissa", "rural"),
        ("Lafey", "rural"),
        ("Kutulo", "rural"),
    ],
    "Uasin Gishu": [
        ("Eldoret Town", "urban"),
        ("Kapseret", "peri-urban"),
        ("Moiben", "rural"),
        ("Ainabkoi", "rural"),
        ("Soy", "rural"),
    ],
    "Garissa": [
        ("Garissa Township", "peri-urban"),
        ("Fafi", "rural"),
        ("Ijara", "rural"),
        ("Hulugho", "rural"),
        ("Balambala", "rural"),
    ],
}


def _synthetic_bands_for_county(county: str) -> list[tuple[str, str]]:
    """
    KNBS-style urban gradient approximated from county poverty headcount:
    higher poverty ASAL counties skew toward rural bands; lower-poverty
    counties retain more urban / peri-urban slots.

    Always returns exactly 10 ordered bands for stable hash indexing.
    """
    p = COUNTY_POVERTY_INDEX.get(county, DEFAULT_POVERTY_INDEX)
    n = 10
    # Target shares (must sum to 1); rural rises with poverty index.
    rural_share = min(0.85, max(0.15, p / 100.0))
    urban_share = min(0.55, max(0.05, (100.0 - p) / 120.0))
    peri_share = max(0.0, 1.0 - rural_share - urban_share)
    s = rural_share + urban_share + peri_share
    rural_share /= s
    urban_share /= s
    peri_share /= s

    rural_n = int(round(rural_share * n))
    urban_n = int(round(urban_share * n))
    peri_n = n - rural_n - urban_n
    rural_n = max(1, min(n - 2, rural_n))
    urban_n = max(1, min(n - rural_n - 1, urban_n))
    peri_n = n - rural_n - urban_n
    peri_n = max(1, peri_n)
    if rural_n + urban_n + peri_n > n:
        rural_n = n - urban_n - peri_n

    bands: list[tuple[str, str]] = []
    for i in range(urban_n):
        bands.append((f"Urban sector {i + 1}", "urban"))
    for i in range(peri_n):
        bands.append((f"Peri-urban sector {i + 1}", "peri-urban"))
    for i in range(rural_n):
        bands.append((f"Rural sector {i + 1}", "rural"))

    assert len(bands) == n
    return bands


def subcounty_bands_for_county(county: str) -> list[tuple[str, str]]:
    """Return ordered KNBS-linked bands for hashing / lookup."""
    key = county.strip().title()
    if key in COUNTY_SUBCOUNTY_LOCATION_BANDS:
        return COUNTY_SUBCOUNTY_LOCATION_BANDS[key]
    return _synthetic_bands_for_county(key)


def county_aggregate_location_score(county: str) -> float:
    """
    Expected equity-need score (0-100) when coordinates are not supplied:
    weighted average of band scores for the county.
    """
    bands = subcounty_bands_for_county(county)
    total = 0.0
    for _, loc in bands:
        total += _location_type_raw_score(loc)
    return total / max(len(bands), 1)


def _location_type_raw_score(location_type: str) -> float:
    t = location_type.strip().lower()
    if t == "urban":
        return 0.0
    if t in ("peri-urban", "periurban", "peri_urban"):
        return 50.0
    if t == "rural":
        return 100.0
    return 50.0
