"""
EquityGrid Kenya — Six-variable equity scoring model.

Higher final score → more affluent / cross-subsidy risk (RED).
Lower final score → more vulnerable (GREEN).
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Any

from app.config import get_settings
from app.scoring.constants import (
    COUNTY_NSPS_COVERAGE_RATE,
    DEFAULT_NSPS_COVERAGE_RATE,
    HIGH_POVERTY_COUNTIES,
)


def _clamp(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, value))


def hash_account_id(account_id: str) -> str:
    return hashlib.sha256(account_id.encode("utf-8")).hexdigest()


@dataclass
class ScoringResult:
    account_id_hash: str
    county: str
    ward_avg_household_size: float
    kwh_month: float
    avg_disconnection_days_per_month: float
    nsps_registered: bool
    county_nsps_coverage_rate: float
    peak_demand_ratio: float
    has_three_phase: bool
    connection_capacity_kva: float
    accounts_same_address: int
    urban_rural_classification: str

    score_consumption_per_capita: float
    score_payment_consistency: float
    score_nsps_status: float
    score_peak_demand_ratio: float
    score_upgrade_history: float
    score_active_accounts: float

    equity_score: float
    classification: str
    suggested_tariff_multiplier: float
    flags: list[str]


def compute_subscores(
    ward_avg_household_size: float,
    kwh_month: float,
    avg_disconnection_days_per_month: float,
    nsps_registered: bool,
    county_nsps_coverage_rate: float,
    peak_demand_ratio: float,
    has_three_phase: bool,
    connection_capacity_kva: float,
    accounts_same_address: int,
    settings: Any,
) -> dict[str, float]:
    bench = float(settings.NATIONAL_CAPITA_BENCHMARK_KWH)
    kwh_per_person = float(kwh_month) / max(float(ward_avg_household_size), 0.5)
    capita_score = _clamp((kwh_per_person / bench) * 33.0)

    disconnection_days = float(avg_disconnection_days_per_month)
    consistency_score = _clamp(100.0 - (disconnection_days * 15.0))

    if nsps_registered:
        nsps_score = 0.0
    else:
        rate = _clamp(float(county_nsps_coverage_rate), 0.0, 1.0)
        nsps_score = _clamp(50.0 + (rate * 50.0))

    pr = _clamp(float(peak_demand_ratio), 0.0, 1.0)
    peak_score = _clamp(100.0 - (pr * 120.0))

    if has_three_phase:
        upgrade_score = 100.0
    elif float(connection_capacity_kva) > 5.0:
        upgrade_score = 70.0
    else:
        upgrade_score = 10.0

    n_addr = int(accounts_same_address)
    if n_addr >= 3:
        accounts_score = 100.0
    elif n_addr == 2:
        accounts_score = 60.0
    else:
        accounts_score = 0.0

    return {
        "consumption_per_capita": round(capita_score, 1),
        "payment_consistency": round(consistency_score, 1),
        "nsps_status": round(nsps_score, 1),
        "peak_demand_ratio": round(peak_score, 1),
        "upgrade_history": round(upgrade_score, 1),
        "active_accounts": round(accounts_score, 1),
    }


def compute_final_score(variable_scores: dict[str, float], settings: Any) -> float:
    s = variable_scores
    final = (
        s["consumption_per_capita"] * float(settings.WEIGHT_CONSUMPTION_PER_CAPITA)
        + s["payment_consistency"] * float(settings.WEIGHT_PAYMENT_CONSISTENCY)
        + s["nsps_status"] * float(settings.WEIGHT_NSPS)
        + s["peak_demand_ratio"] * float(settings.WEIGHT_PEAK_DEMAND_RATIO)
        + s["upgrade_history"] * float(settings.WEIGHT_UPGRADE_HISTORY)
        + s["active_accounts"] * float(settings.WEIGHT_ACTIVE_ACCOUNTS)
    )
    return round(_clamp(final), 1)


def classify_from_score(final_score: float, settings: Any) -> tuple[str, float]:
    if final_score <= float(settings.SCORE_MAX_GREEN):
        return "GREEN", float(settings.TARIFF_GREEN)
    if final_score <= float(settings.SCORE_MAX_YELLOW):
        return "YELLOW", float(settings.TARIFF_YELLOW)
    return "RED", float(settings.TARIFF_RED)


def explain_score(result: ScoringResult) -> str:
    """Short rationale without naming internal variable weights."""
    kwh_pp = result.kwh_month / max(result.ward_avg_household_size, 0.5)
    if result.classification == "GREEN":
        return (
            "This household shows constrained use relative to household size and more "
            "frequent gaps in supply, consistent with needing lifeline protection. "
            "The overall pattern points to genuine vulnerability rather than discretionary luxury use."
        )
    if result.classification == "YELLOW":
        return (
            "Usage and connection patterns sit in a middle band — neither strongly "
            "constrained nor strongly indicative of high discretionary capacity. "
            "Standard retail terms are appropriate while monitoring for drift over time."
        )
    return (
        "Relative to household size and connection characteristics, this account shows "
        "stronger capacity signals and fewer vulnerability markers. "
        "That profile supports treating it as a cross-subsidy contributor under the equity framework."
    )


def equity_orm_to_scoring_result(row: Any) -> ScoringResult:
    flags_raw = getattr(row, "flags", None) or ""
    flags: list[str] = json.loads(flags_raw) if flags_raw else []
    cls_val = (
        row.classification.value
        if hasattr(row.classification, "value")
        else str(row.classification)
    )
    return ScoringResult(
        account_id_hash=row.account_id_hash,
        county=row.county,
        ward_avg_household_size=float(row.ward_avg_household_size),
        kwh_month=float(row.kwh_month),
        avg_disconnection_days_per_month=float(row.avg_disconnection_days_per_month),
        nsps_registered=bool(row.nsps_registered),
        county_nsps_coverage_rate=float(row.county_nsps_coverage_rate),
        peak_demand_ratio=float(row.peak_demand_ratio),
        has_three_phase=bool(row.has_three_phase),
        connection_capacity_kva=float(row.connection_capacity_kva),
        accounts_same_address=int(row.accounts_same_address),
        urban_rural_classification=str(row.urban_rural_classification),
        score_consumption_per_capita=float(row.score_consumption_per_capita),
        score_payment_consistency=float(row.score_payment_consistency),
        score_nsps_status=float(row.score_nsps_status),
        score_peak_demand_ratio=float(row.score_peak_demand_ratio),
        score_upgrade_history=float(row.score_upgrade_history),
        score_active_accounts=float(row.score_active_accounts),
        equity_score=float(row.equity_score),
        classification=cls_val,
        suggested_tariff_multiplier=float(row.suggested_tariff_multiplier),
        flags=flags,
    )


def calculate_equity_score(
    account_id: str,
    county: str,
    ward_avg_household_size: float,
    kwh_month: float,
    avg_disconnection_days_per_month: float,
    nsps_registered: bool,
    county_nsps_coverage_rate: float,
    peak_demand_ratio: float,
    has_three_phase: bool,
    connection_capacity_kva: float,
    accounts_same_address: int,
    urban_rural_classification: str,
) -> ScoringResult:
    settings = get_settings()
    account_id_hash = hash_account_id(account_id)
    county_norm = county.strip().title()

    vs = compute_subscores(
        ward_avg_household_size=ward_avg_household_size,
        kwh_month=kwh_month,
        avg_disconnection_days_per_month=avg_disconnection_days_per_month,
        nsps_registered=nsps_registered,
        county_nsps_coverage_rate=county_nsps_coverage_rate,
        peak_demand_ratio=peak_demand_ratio,
        has_three_phase=has_three_phase,
        connection_capacity_kva=connection_capacity_kva,
        accounts_same_address=accounts_same_address,
        settings=settings,
    )
    equity_score = compute_final_score(vs, settings)
    classification, tariff = classify_from_score(equity_score, settings)

    flags: list[str] = []
    kwh_pp = float(kwh_month) / max(float(ward_avg_household_size), 0.5)
    bench = float(settings.NATIONAL_CAPITA_BENCHMARK_KWH)
    if (
        classification == "RED"
        and county_norm in HIGH_POVERTY_COUNTIES
        and kwh_pp > bench * 1.25
    ):
        flags.append("LUXURY_IN_POVERTY_ZONE")

    return ScoringResult(
        account_id_hash=account_id_hash,
        county=county_norm,
        ward_avg_household_size=float(ward_avg_household_size),
        kwh_month=float(kwh_month),
        avg_disconnection_days_per_month=float(avg_disconnection_days_per_month),
        nsps_registered=bool(nsps_registered),
        county_nsps_coverage_rate=float(county_nsps_coverage_rate),
        peak_demand_ratio=float(peak_demand_ratio),
        has_three_phase=bool(has_three_phase),
        connection_capacity_kva=float(connection_capacity_kva),
        accounts_same_address=int(accounts_same_address),
        urban_rural_classification=urban_rural_classification.strip() or "Rural",
        score_consumption_per_capita=float(vs["consumption_per_capita"]),
        score_payment_consistency=float(vs["payment_consistency"]),
        score_nsps_status=float(vs["nsps_status"]),
        score_peak_demand_ratio=float(vs["peak_demand_ratio"]),
        score_upgrade_history=float(vs["upgrade_history"]),
        score_active_accounts=float(vs["active_accounts"]),
        equity_score=float(equity_score),
        classification=classification,
        suggested_tariff_multiplier=float(tariff),
        flags=flags,
    )


def default_nsps_coverage_for_county(county: str) -> float:
    return float(
        COUNTY_NSPS_COVERAGE_RATE.get(county.strip().title(), DEFAULT_NSPS_COVERAGE_RATE),
    )
