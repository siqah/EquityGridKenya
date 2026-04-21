"""
EquityGrid Kenya — Equity Scoring Engine

Core calculation logic for the multi-signal equity scoring algorithm.
Assigns GREEN (subsidize), YELLOW (standard), or RED (luxury/anomaly)
classification based on three weighted signals:

  Signal 1 — Geographic Zone (poverty index)      : 40%
  Signal 2 — Token Purchase Patterns               : 30%
  Signal 3 — Consumption Data (kWh + load spikes)  : 30%

CRITICAL: The "Turkana Exception" — a household in a high-poverty zone
with luxury-level consumption is flagged RED regardless of geographic score.
"""

import hashlib
import json
from dataclasses import dataclass

from app.config import get_settings
from app.scoring.constants import (
    COUNTY_POVERTY_INDEX,
    DEFAULT_POVERTY_INDEX,
    TOKEN_AMOUNT_MAX,
    TOKEN_FREQUENCY_MAX,
    CONSUMPTION_MAX_KWH,
    LOAD_SPIKE_THRESHOLD_KW,
    HIGH_POVERTY_THRESHOLD,
    TURKANA_EXCEPTION_OVERRIDE_KWH,
    TURKANA_EXCEPTION_OVERRIDE_KW,
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


@dataclass
class ScoringResult:
    """Complete result of the equity scoring calculation."""

    account_id_hash: str
    county: str
    poverty_index: float

    # Individual signal scores (0-100)
    geographic_score: float
    token_score: float
    consumption_score: float

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
    Signal 1 — Geographic Zone Score.

    Direct mapping from county poverty index.
    Higher poverty → higher score → more likely GREEN (needs subsidy).

    Score = poverty_index (already 0-100)
    """
    return _clamp(poverty_index)


def _calculate_token_score(
    avg_amount: float,
    frequency: int,
) -> float:
    """
    Signal 3 — Token Purchase Pattern Score.

    Indicators of energy poverty:
    - High frequency purchases (buying small amounts frequently = cash-constrained)
    - Low average amount per purchase

    Score composition:
    - Frequency factor (50%): Higher frequency → higher score
    - Amount factor (50%): Lower amount → higher score (inverted)
    """
    # Frequency factor: normalized to 0-100
    # More frequent small purchases indicate energy poverty
    freq_normalized = min(frequency / TOKEN_FREQUENCY_MAX, 1.0)
    frequency_factor = freq_normalized * 100.0

    # Amount factor: inverted — lower amounts indicate poverty
    # KSh 50 → score ~99, KSh 20000 → score ~0
    amount_normalized = min(avg_amount / TOKEN_AMOUNT_MAX, 1.0)
    amount_factor = (1.0 - amount_normalized) * 100.0

    token_score = (frequency_factor * 0.5) + (amount_factor * 0.5)
    return _clamp(token_score)


def _calculate_consumption_score(
    total_kwh: float,
    peak_load_kw: float,
) -> float:
    """
    Signal 2 — Consumption Data Score.

    Low consumption + no spikes → genuine low-income → high score (GREEN)
    High consumption + spikes → luxury/comfortable → low score (RED)

    Score composition:
    - kWh factor (60%): Lower consumption → higher score (inverted)
    - Spike penalty (40%): Load spikes reduce score significantly
    """
    # kWh factor: inverted — lower consumption = higher score
    kwh_normalized = min(total_kwh / CONSUMPTION_MAX_KWH, 1.0)
    kwh_factor = (1.0 - kwh_normalized) * 100.0

    # Spike penalty: presence of high instantaneous loads
    if peak_load_kw >= LOAD_SPIKE_THRESHOLD_KW:
        # Scale penalty based on how far above threshold
        spike_severity = min(peak_load_kw / (LOAD_SPIKE_THRESHOLD_KW * 2), 1.0)
        spike_factor = (1.0 - spike_severity) * 100.0
    else:
        # No spike — full score for this component
        spike_factor = 100.0

    consumption_score = (kwh_factor * 0.6) + (spike_factor * 0.4)
    return _clamp(consumption_score)


def _detect_turkana_exception(
    county: str,
    poverty_index: float,
    total_kwh: float,
    peak_load_kw: float,
) -> bool:
    """
    Detect the "Turkana Exception" — luxury consumption in a high-poverty zone.

    This catches potential fraud or misclassification where a wealthy household
    in a poor county would otherwise receive undeserved subsidies.

    Conditions (ALL must be true):
    1. County is in a high-poverty zone (poverty_index >= 60)
    2. Consumption exceeds 200 kWh/month (way above lifeline)
    3. Peak load indicates luxury appliances (>= 5 kW)
    """
    return (
        poverty_index >= HIGH_POVERTY_THRESHOLD
        and total_kwh > TURKANA_EXCEPTION_OVERRIDE_KWH
        and peak_load_kw >= TURKANA_EXCEPTION_OVERRIDE_KW
    )


def calculate_equity_score(
    account_id: str,
    county: str,
    token_avg_amount: float,
    token_frequency: int,
    total_kwh: float,
    peak_load_kw: float,
) -> ScoringResult:
    """
    Main equity scoring function.

    Calculates a weighted score from three signals and assigns a
    classification (GREEN/YELLOW/RED) with a suggested tariff multiplier.

    CRITICAL: Implements the Turkana Exception override — luxury consumption
    in high-poverty zones is forced to RED classification regardless of
    the geographic signal.

    Args:
        account_id:       Raw account identifier (will be hashed)
        county:           Kenya county name
        token_avg_amount:  Average token purchase in KSh
        token_frequency:   Token purchases per month
        total_kwh:         Monthly consumption in kWh
        peak_load_kw:      Peak instantaneous load in kW

    Returns:
        ScoringResult with full breakdown and classification.
    """
    settings = get_settings()

    # ── Hash the account ID for privacy ──
    account_id_hash = hash_account_id(account_id)

    # ── Look up poverty index ──
    county_normalized = county.strip().title()
    poverty_index = COUNTY_POVERTY_INDEX.get(county_normalized, DEFAULT_POVERTY_INDEX)

    # ── Detect load spike ──
    has_load_spike = peak_load_kw >= LOAD_SPIKE_THRESHOLD_KW

    # ── Calculate individual signal scores ──
    geographic_score = _calculate_geographic_score(poverty_index)
    token_score = _calculate_token_score(token_avg_amount, token_frequency)
    consumption_score = _calculate_consumption_score(total_kwh, peak_load_kw)

    # ── Weighted final score ──
    equity_score = (
        geographic_score * settings.WEIGHT_GEOGRAPHIC
        + token_score * settings.WEIGHT_TOKEN
        + consumption_score * settings.WEIGHT_CONSUMPTION
    )
    equity_score = _clamp(equity_score)

    # ── Classification ──
    flags: list[str] = []

    if equity_score >= settings.THRESHOLD_GREEN:
        classification = "GREEN"
        tariff = settings.TARIFF_GREEN
    elif equity_score >= settings.THRESHOLD_YELLOW:
        classification = "YELLOW"
        tariff = settings.TARIFF_YELLOW
    else:
        classification = "RED"
        tariff = settings.TARIFF_RED

    # ── TURKANA EXCEPTION OVERRIDE ──
    # High-poverty zone + luxury consumption → force RED
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
        consumption_score=round(consumption_score, 2),
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
