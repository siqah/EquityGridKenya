"""
EquityGrid Kenya — Equity Scoring Engine

Multi-signal weighted score with explicit variables:

  Variable 5 — County poverty index (KNBS / WB)     : 25%
  Token purchase pattern                              : 30%
  Variable 1 — Monthly kWh band (lifeline vs high)    : 10%
  Variable 2 — Location type (KNBS Census Vol II–linked, hashed coords) : 10%
  Peak load / spike profile (luxury appliance signal) : 25%

CRITICAL: The "Turkana Exception" — a household in a high-poverty zone
with luxury-level consumption is flagged RED regardless of other signals.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Any

from app.config import get_settings
from app.scoring.constants import (
    CONSUMPTION_HIGH_KWH,
    CONSUMPTION_LIFELINE_KWH,
    CONSUMPTION_MAX_KWH,
    CONSUMPTION_STANDARD_KWH,
    COUNTY_POVERTY_INDEX,
    DEFAULT_POVERTY_INDEX,
    LOAD_SPIKE_THRESHOLD_KW,
    TOKEN_AMOUNT_MAX,
    TOKEN_FREQUENCY_MAX,
    HIGH_POVERTY_THRESHOLD,
    TURKANA_EXCEPTION_OVERRIDE_KWH,
    TURKANA_EXCEPTION_OVERRIDE_KW,
)
from app.scoring.knbs_location_metadata import (
    county_aggregate_location_score,
    subcounty_bands_for_county,
)


def _clamp(value: float, min_val: float = 0.0, max_val: float = 100.0) -> float:
    """Clamp a value between min and max."""
    return max(min_val, min(max_val, value))


def hash_account_id(account_id: str) -> str:
    """
    Generate SHA-256 hash of an account ID for privacy protection.
    No raw account IDs should ever be stored or returned.
    """
    return hashlib.sha256(account_id.encode("utf-8")).hexdigest()


def hash_geospatial_layer(latitude: float, longitude: float, pepper: str) -> str:
    """
    Deterministic digest for the geographic layer — quantised coordinates plus
    an optional server pepper. Raw coordinates must not be persisted; only
    this digest (or a short prefix) may appear in audit trails.
    """
    lat_q = round(float(latitude), 5)
    lon_q = round(float(longitude), 5)
    payload = f"{pepper}\x00{lat_q:.5f}\x00{lon_q:.5f}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _location_type_score(location_type: str) -> float:
    """Map Variable 2 classes to 0–100 equity-need scores."""
    t = location_type.strip().lower()
    if t == "urban":
        return 0.0
    if t in ("peri-urban", "periurban", "peri_urban"):
        return 50.0
    if t == "rural":
        return 100.0
    return 50.0


def classify_location_with_geo_hash(
    county: str,
    latitude: float | None,
    longitude: float | None,
    pepper: str,
) -> tuple[float, str, str | None, str | None]:
    """
    Variable 2 — derive location type from hashed geospatial coordinates when
    coords are supplied; otherwise county aggregate (KNBS band mixture).

    Returns:
        location_equity_score (0–100), location_type, subcounty_label_or_None,
        geo_layer_fingerprint_prefix_or_None
    """
    county_norm = county.strip().title()

    if latitude is None or longitude is None:
        score = county_aggregate_location_score(county_norm)
        return _clamp(score), "county_aggregate", None, None

    digest = hash_geospatial_layer(latitude, longitude, pepper)
    bands = subcounty_bands_for_county(county_norm)
    idx = int(digest[:12], 16) % len(bands)
    sub_label, loc_type = bands[idx]
    return _clamp(_location_type_score(loc_type)), loc_type, sub_label, digest[:16]


@dataclass
class ScoringResult:
    """Complete result of the equity scoring calculation."""

    account_id_hash: str
    county: str
    poverty_index: float

    # Individual signal scores (0-100)
    geographic_score: float
    token_score: float
    monthly_kwh_equity_score: float
    location_equity_score: float
    load_profile_score: float

    # Backward-compatible combined label: same as load_profile_score (DB column)
    consumption_score: float

    location_type: str
    location_subcounty: str | None
    geo_layer_fingerprint: str | None

    # Final result
    equity_score: float
    classification: str          # "GREEN", "YELLOW", "RED"
    suggested_tariff_multiplier: float
    flags: list[str]

    # Input echo
    token_avg_amount: float
    token_frequency: int
    total_kwh: float
    peak_load_kw: float
    has_load_spike: bool


def _calculate_geographic_score(poverty_index: float) -> float:
    """
    Variable 5 — County poverty index score.

    Direct mapping from county poverty index.
    Higher poverty → higher score → more likely GREEN (needs subsidy).
    """
    return _clamp(poverty_index)


def _calculate_token_score(
    avg_amount: float,
    frequency: int,
) -> float:
    """Token purchase pattern score (0–100)."""
    freq_normalized = min(frequency / TOKEN_FREQUENCY_MAX, 1.0)
    frequency_factor = freq_normalized * 100.0

    amount_normalized = min(avg_amount / TOKEN_AMOUNT_MAX, 1.0)
    amount_factor = (1.0 - amount_normalized) * 100.0

    token_score = (frequency_factor * 0.5) + (amount_factor * 0.5)
    return _clamp(token_score)


def _calculate_monthly_kwh_equity_score(total_kwh: float) -> float:
    """
    Variable 1 — Normalised monthly kWh equity score (0–100).

    Low monthly kWh (< lifeline ceiling) → high equity score (green-leaning).
    High monthly kWh (> standard domestic tier) → low equity score (red-leaning).
    This component is weighted at 10% so large but vulnerable households are
    not dominated by consumption alone.
    """
    kwh = max(float(total_kwh), 0.0)

    if kwh <= CONSUMPTION_LIFELINE_KWH:
        return 100.0

    if kwh <= CONSUMPTION_STANDARD_KWH:
        # 30–200 kWh: glide from lifeline toward neutral
        span = CONSUMPTION_STANDARD_KWH - CONSUMPTION_LIFELINE_KWH
        t = (kwh - CONSUMPTION_LIFELINE_KWH) / span
        return _clamp(100.0 - t * 55.0)

    if kwh <= CONSUMPTION_HIGH_KWH:
        span = CONSUMPTION_HIGH_KWH - CONSUMPTION_STANDARD_KWH
        t = (kwh - CONSUMPTION_STANDARD_KWH) / span
        return _clamp(45.0 - t * 30.0)

    if kwh < CONSUMPTION_MAX_KWH:
        span = CONSUMPTION_MAX_KWH - CONSUMPTION_HIGH_KWH
        t = (kwh - CONSUMPTION_HIGH_KWH) / span
        return _clamp(15.0 - t * 15.0)

    return 0.0


def _calculate_load_profile_score(peak_load_kw: float) -> float:
    """
    Peak instantaneous load — luxury appliance / demand-spike signal only.

    Monthly kWh is handled separately (Variable 1) at a capped weight.
    """
    if peak_load_kw >= LOAD_SPIKE_THRESHOLD_KW:
        spike_severity = min(peak_load_kw / (LOAD_SPIKE_THRESHOLD_KW * 2), 1.0)
        return _clamp((1.0 - spike_severity) * 100.0)
    return 100.0


def _detect_turkana_exception(
    county: str,
    poverty_index: float,
    total_kwh: float,
    peak_load_kw: float,
) -> bool:
    """Luxury consumption in a high-poverty zone → forced RED."""
    return (
        poverty_index >= HIGH_POVERTY_THRESHOLD
        and total_kwh > TURKANA_EXCEPTION_OVERRIDE_KWH
        and peak_load_kw >= TURKANA_EXCEPTION_OVERRIDE_KW
    )


def explain_score(result: ScoringResult) -> str:
    """
    Human-readable classification rationale referencing Variable 1, 2, and 5.
    """
    if result.poverty_index >= HIGH_POVERTY_THRESHOLD:
        poverty_phrase = "High poverty location (Variable 5)"
    elif result.poverty_index >= 40.0:
        poverty_phrase = "Moderate poverty context (Variable 5)"
    else:
        poverty_phrase = "Lower county poverty headcount (Variable 5)"

    lt = result.location_type.lower().replace("_", "-")
    if lt == "urban":
        loc_phrase = "Urban status (Variable 2)"
    elif lt in ("peri-urban", "periurban"):
        loc_phrase = "Peri-urban location (Variable 2)"
    elif lt == "rural":
        loc_phrase = "Rural location (Variable 2)"
    else:
        loc_phrase = "County-aggregate location context (Variable 2)"

    if result.monthly_kwh_equity_score >= 75.0:
        cons_phrase = "lifeline-level consumption (Variable 1)"
    elif result.monthly_kwh_equity_score <= 35.0:
        cons_phrase = "high consumption (Variable 1)"
    else:
        cons_phrase = "moderate monthly consumption (Variable 1)"

    balance_word = "balanced by"
    if result.classification == "GREEN":
        balance_word = "reinforced by"
    elif result.classification == "RED":
        balance_word = "pulled toward luxury risk by"

    return (
        f"Classified as {result.classification}: {poverty_phrase} {balance_word} "
        f"{loc_phrase} and {cons_phrase}."
    )


def equity_orm_to_scoring_result(row: Any) -> ScoringResult:
    """
    Rebuild a ScoringResult from a persisted ORM row (for explainability on reads).
    """
    flags_raw = getattr(row, "flags", None) or ""
    flags: list[str] = json.loads(flags_raw) if flags_raw else []
    cls_val = (
        row.classification.value
        if hasattr(row.classification, "value")
        else str(row.classification)
    )
    load_prof = float(getattr(row, "load_profile_score", None) or row.consumption_score)
    return ScoringResult(
        account_id_hash=row.account_id_hash,
        county=row.county,
        poverty_index=row.poverty_index,
        geographic_score=row.geographic_score,
        token_score=row.token_score,
        monthly_kwh_equity_score=float(
            getattr(row, "monthly_kwh_equity_score", None) or 0.0
        ),
        location_equity_score=float(getattr(row, "location_equity_score", None) or 0.0),
        load_profile_score=load_prof,
        consumption_score=row.consumption_score,
        location_type=getattr(row, "location_type", None) or "county_aggregate",
        location_subcounty=getattr(row, "location_subcounty", None),
        geo_layer_fingerprint=getattr(row, "geo_layer_fingerprint", None),
        equity_score=row.equity_score,
        classification=cls_val,
        suggested_tariff_multiplier=row.suggested_tariff_multiplier,
        flags=flags,
        token_avg_amount=row.token_avg_amount,
        token_frequency=row.token_frequency,
        total_kwh=row.total_kwh,
        peak_load_kw=row.peak_load_kw,
        has_load_spike=row.has_load_spike,
    )


def calculate_equity_score(
    account_id: str,
    county: str,
    token_avg_amount: float,
    token_frequency: int,
    total_kwh: float,
    peak_load_kw: float,
    latitude: float | None = None,
    longitude: float | None = None,
) -> ScoringResult:
    """
    Weighted equity score with Variables 1, 2, and 5 integrated.

    Optional latitude/longitude are used only in-memory to derive Variable 2
    via ``hash_geospatial_layer`` — they must not be written to ``EquityResult``.
    """
    settings = get_settings()

    account_id_hash = hash_account_id(account_id)

    county_normalized = county.strip().title()
    poverty_index = COUNTY_POVERTY_INDEX.get(county_normalized, DEFAULT_POVERTY_INDEX)

    has_load_spike = peak_load_kw >= LOAD_SPIKE_THRESHOLD_KW

    geographic_score = _calculate_geographic_score(poverty_index)
    token_score = _calculate_token_score(token_avg_amount, token_frequency)
    monthly_kwh_equity_score = _calculate_monthly_kwh_equity_score(total_kwh)
    load_profile_score = _calculate_load_profile_score(peak_load_kw)

    location_equity_score, location_type, location_subcounty, geo_fp = (
        classify_location_with_geo_hash(
            county_normalized,
            latitude,
            longitude,
            settings.GEOSPATIAL_LAYER_PEPPER,
        )
    )

    flags: list[str] = []
    if latitude is None or longitude is None:
        flags.append("LOCATION_AGGREGATE_NO_COORDS")

    equity_score = (
        geographic_score * settings.WEIGHT_GEOGRAPHIC
        + token_score * settings.WEIGHT_TOKEN
        + monthly_kwh_equity_score * settings.WEIGHT_MONTHLY_KWH
        + location_equity_score * settings.WEIGHT_LOCATION
        + load_profile_score * settings.WEIGHT_LOAD_PROFILE
    )
    equity_score = _clamp(equity_score)

    if equity_score >= settings.THRESHOLD_GREEN:
        classification = "GREEN"
        tariff = settings.TARIFF_GREEN
    elif equity_score >= settings.THRESHOLD_YELLOW:
        classification = "YELLOW"
        tariff = settings.TARIFF_YELLOW
    else:
        classification = "RED"
        tariff = settings.TARIFF_RED

    is_turkana_exception = _detect_turkana_exception(
        county_normalized, poverty_index, total_kwh, peak_load_kw
    )

    if is_turkana_exception:
        classification = "RED"
        tariff = settings.TARIFF_RED
        flags.append("TURKANA_EXCEPTION")

    return ScoringResult(
        account_id_hash=account_id_hash,
        county=county_normalized,
        poverty_index=poverty_index,
        geographic_score=round(geographic_score, 2),
        token_score=round(token_score, 2),
        monthly_kwh_equity_score=round(monthly_kwh_equity_score, 2),
        location_equity_score=round(location_equity_score, 2),
        load_profile_score=round(load_profile_score, 2),
        consumption_score=round(load_profile_score, 2),
        location_type=location_type,
        location_subcounty=location_subcounty,
        geo_layer_fingerprint=geo_fp,
        equity_score=round(equity_score, 2),
        classification=classification,
        suggested_tariff_multiplier=tariff,
        flags=flags,
        token_avg_amount=token_avg_amount,
        token_frequency=token_frequency,
        total_kwh=total_kwh,
        peak_load_kw=peak_load_kw,
        has_load_spike=has_load_spike,
    )
