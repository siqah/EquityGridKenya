#!/usr/bin/env python3
"""
EquityGrid Kenya — Synthetic Dataset Generator

Builds 1,000 scored household rows aligned with the six-variable equity model
(same field ranges as the frontend synthetic cohort) and writes them to the
database via calculate_equity_score.

Usage:
    python scripts/generate_synthetic_data.py
"""

from __future__ import annotations

import json
import os
import random
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, init_db
from app.models import AuditTrail, Classification, EquityResult
from app.scoring.engine import calculate_equity_score, default_nsps_coverage_for_county

OTHER_COUNTIES = [
    "Kiambu", "Meru", "Nyeri", "Embu", "Garissa", "Wajir", "Baringo", "Laikipia",
    "Kitui", "Makueni", "Kajiado", "Narok", "Bomet", "Kericho", "Vihiga", "Bungoma",
    "Busia", "Siaya", "Isiolo", "Samburu", "Lamu", "Kwale", "Kilifi", "Migori",
    "Nyamira", "Kisii", "Nandi", "Trans Nzoia", "Elgeyo Marakwet", "Tharaka Nithi",
]

ARID_COUNTIES = frozenset({
    "Turkana", "Mandera", "Wajir", "Garissa", "Marsabit", "Samburu", "Isiolo",
    "West Pokot", "Baringo", "Kitui", "Makueni", "Tana River", "Lamu",
})

URBAN_MAJOR = frozenset({"Nairobi", "Mombasa", "Kisumu"})

COUNTY_WEIGHTS = (
    [("Nairobi", 300), ("Mombasa", 120), ("Kisumu", 100), ("Nakuru", 80)]
    + [("Turkana", 60), ("Kakamega", 50), ("Machakos", 50)]
    + [(c, 240 // max(1, len(OTHER_COUNTIES))) for c in OTHER_COUNTIES]
)

RESERVED_DEMO_IDS = frozenset({"ACC_168669", "ACC_004521", "ACC_772301"})


def pick_county(rng: random.Random) -> str:
    names, weights = zip(*COUNTY_WEIGHTS)
    return rng.choices(names, weights=weights, k=1)[0]


def urban_rural_pick(rng: random.Random, county_base: str) -> str:
    if county_base in URBAN_MAJOR:
        u = rng.random()
        if u < 0.55:
            return "Urban"
        if u < 0.85:
            return "Peri-urban"
        return "Rural"
    u = rng.random()
    if u < 0.2:
        return "Urban"
    if u < 0.45:
        return "Peri-urban"
    return "Rural"


def nsps_for_tier(rng: random.Random, tier: str, county_base: str) -> bool:
    if tier == "RED":
        return False
    if tier == "GREEN":
        if county_base in ARID_COUNTIES:
            return rng.random() < 0.35
        if county_base in URBAN_MAJOR:
            return rng.random() < 0.08
        return rng.random() < 0.2
    return rng.random() < 0.15


def sample_inputs_for_tier(rng: random.Random, tier: str, county_base: str) -> dict:
    ward_avg_household_size = round(rng.uniform(2.1, 6.8), 1)

    if tier == "GREEN":
        avg_disconnection_days_per_month = float(rng.randint(4, 12))
        peak_demand_ratio = round(rng.uniform(0.65, 0.90), 2)
        kwh_month = float(rng.randint(18, 95))
        has_three_phase = False
        connection_capacity_kva = round(rng.uniform(2.0, 4.8), 1)
        accounts_same_address = 1
    elif tier == "YELLOW":
        avg_disconnection_days_per_month = float(rng.randint(1, 3))
        peak_demand_ratio = round(rng.uniform(0.40, 0.64), 2)
        kwh_month = float(rng.randint(75, 210))
        has_three_phase = rng.random() < 0.05
        connection_capacity_kva = (
            round(rng.uniform(6.0, 16.0), 1) if has_three_phase else round(rng.uniform(2.5, 6.0), 1)
        )
        accounts_same_address = 1 if rng.random() < 0.65 else 2
    else:
        avg_disconnection_days_per_month = 0.0
        peak_demand_ratio = round(rng.uniform(0.10, 0.39), 2)
        kwh_month = float(rng.randint(200, 620))
        has_three_phase = rng.random() < 0.4
        connection_capacity_kva = (
            round(rng.uniform(12.0, 40.0), 1) if has_three_phase else round(rng.uniform(5.0, 15.0), 1)
        )
        accounts_same_address = rng.randint(1, 4)

    nsps_registered = nsps_for_tier(rng, tier, county_base)
    county_nsps_coverage_rate = default_nsps_coverage_for_county(county_base)
    urban_rural_classification = urban_rural_pick(rng, county_base)

    return {
        "ward_avg_household_size": ward_avg_household_size,
        "kwh_month": kwh_month,
        "avg_disconnection_days_per_month": avg_disconnection_days_per_month,
        "nsps_registered": nsps_registered,
        "county_nsps_coverage_rate": county_nsps_coverage_rate,
        "peak_demand_ratio": peak_demand_ratio,
        "has_three_phase": has_three_phase,
        "connection_capacity_kva": connection_capacity_kva,
        "accounts_same_address": accounts_same_address,
        "urban_rural_classification": urban_rural_classification,
    }


def resample_until_tier(
    rng: random.Random,
    tier: str,
    county: str,
    account_id: str,
    max_tries: int = 60,
):
    inputs: dict = {}
    result = None
    for _ in range(max_tries):
        inputs = sample_inputs_for_tier(rng, tier, county)
        result = calculate_equity_score(
            account_id=account_id,
            county=county,
            ward_avg_household_size=inputs["ward_avg_household_size"],
            kwh_month=inputs["kwh_month"],
            avg_disconnection_days_per_month=inputs["avg_disconnection_days_per_month"],
            nsps_registered=inputs["nsps_registered"],
            county_nsps_coverage_rate=inputs["county_nsps_coverage_rate"],
            peak_demand_ratio=inputs["peak_demand_ratio"],
            has_three_phase=inputs["has_three_phase"],
            connection_capacity_kva=inputs["connection_capacity_kva"],
            accounts_same_address=inputs["accounts_same_address"],
            urban_rural_classification=inputs["urban_rural_classification"],
        )
        if result.classification == tier:
            return result, inputs
    assert result is not None
    return result, inputs


def persist_result(db, result, inputs: dict, audit_action: str = "SCORE_CALCULATED") -> None:
    flags_json = json.dumps(result.flags)
    payload = dict(
        county=result.county,
        ward_avg_household_size=result.ward_avg_household_size,
        kwh_month=result.kwh_month,
        avg_disconnection_days_per_month=result.avg_disconnection_days_per_month,
        nsps_registered=result.nsps_registered,
        county_nsps_coverage_rate=result.county_nsps_coverage_rate,
        peak_demand_ratio=result.peak_demand_ratio,
        has_three_phase=result.has_three_phase,
        connection_capacity_kva=result.connection_capacity_kva,
        accounts_same_address=result.accounts_same_address,
        urban_rural_classification=inputs["urban_rural_classification"],
        score_consumption_per_capita=result.score_consumption_per_capita,
        score_payment_consistency=result.score_payment_consistency,
        score_nsps_status=result.score_nsps_status,
        score_peak_demand_ratio=result.score_peak_demand_ratio,
        score_upgrade_history=result.score_upgrade_history,
        score_active_accounts=result.score_active_accounts,
        equity_score=result.equity_score,
        classification=Classification(result.classification),
        suggested_tariff_multiplier=result.suggested_tariff_multiplier,
        flags=flags_json,
    )

    existing = (
        db.query(EquityResult)
        .filter(EquityResult.account_id_hash == result.account_id_hash)
        .first()
    )
    if existing:
        for k, v in payload.items():
            setattr(existing, k, v)
        existing.created_at = datetime.now(timezone.utc)
    else:
        db.add(EquityResult(account_id_hash=result.account_id_hash, **payload))

    db.add(
        AuditTrail(
            account_id_hash=result.account_id_hash,
            action=audit_action,
            details=json.dumps(
                {
                    "equity_score": result.equity_score,
                    "classification": result.classification,
                    "tariff_multiplier": result.suggested_tariff_multiplier,
                    "flags": result.flags,
                },
            ),
        ),
    )


def next_account_id(rng: random.Random, used: set[str]) -> str:
    for _ in range(100000):
        h = f"ACC_{rng.randint(100000, 999999):06d}"
        if h in RESERVED_DEMO_IDS or h in used:
            continue
        used.add(h)
        return h
    raise RuntimeError("Could not allocate unique synthetic account id")


def main() -> None:
    print("=" * 70)
    print("  EquityGrid Kenya — Synthetic Dataset Generator (6-variable model)")
    print("  Target: 1,000 accounts + DB persist")
    print("=" * 70)

    rng = random.Random(20260422)

    print("\n  Initializing database...")
    init_db()
    db = SessionLocal()

    print("  Clearing existing equity_results...")
    db.query(EquityResult).delete()
    db.query(AuditTrail).delete()
    db.commit()

    used_ids: set[str] = set()
    results: list = []

    tiers = [("GREEN", 419), ("YELLOW", 355), ("RED", 223)]

    print("\n  Generating cohort...")
    for tier, count in tiers:
        for i in range(count):
            county = pick_county(rng)
            aid = next_account_id(rng, used_ids)
            result, inputs = resample_until_tier(rng, tier, county, aid)
            persist_result(db, result, inputs)
            results.append(result)
        print(f"    {tier}: {count} rows requested")

    demos = [
        (
            "ACC_168669",
            "Turkana",
            {
                "ward_avg_household_size": 5.2,
                "kwh_month": 340.0,
                "avg_disconnection_days_per_month": 0.0,
                "nsps_registered": False,
                "county_nsps_coverage_rate": default_nsps_coverage_for_county("Turkana"),
                "peak_demand_ratio": 0.18,
                "has_three_phase": True,
                "connection_capacity_kva": 15.0,
                "accounts_same_address": 2,
                "urban_rural_classification": "Rural",
            },
        ),
        (
            "ACC_004521",
            "Nairobi",
            {
                "ward_avg_household_size": 5.8,
                "kwh_month": 35.0,
                "avg_disconnection_days_per_month": 9.0,
                "nsps_registered": True,
                "county_nsps_coverage_rate": default_nsps_coverage_for_county("Nairobi"),
                "peak_demand_ratio": 0.82,
                "has_three_phase": False,
                "connection_capacity_kva": 3.5,
                "accounts_same_address": 1,
                "urban_rural_classification": "Urban",
            },
        ),
        (
            "ACC_772301",
            "Nairobi",
            {
                "ward_avg_household_size": 2.1,
                "kwh_month": 580.0,
                "avg_disconnection_days_per_month": 0.0,
                "nsps_registered": False,
                "county_nsps_coverage_rate": default_nsps_coverage_for_county("Nairobi"),
                "peak_demand_ratio": 0.12,
                "has_three_phase": True,
                "connection_capacity_kva": 25.0,
                "accounts_same_address": 4,
                "urban_rural_classification": "Urban",
            },
        ),
    ]

    print("\n  Applying three fixed demo accounts...")
    for aid, county, fields in demos:
        used_ids.add(aid)
        result = calculate_equity_score(
            account_id=aid,
            county=county,
            ward_avg_household_size=fields["ward_avg_household_size"],
            kwh_month=fields["kwh_month"],
            avg_disconnection_days_per_month=fields["avg_disconnection_days_per_month"],
            nsps_registered=fields["nsps_registered"],
            county_nsps_coverage_rate=fields["county_nsps_coverage_rate"],
            peak_demand_ratio=fields["peak_demand_ratio"],
            has_three_phase=fields["has_three_phase"],
            connection_capacity_kva=fields["connection_capacity_kva"],
            accounts_same_address=fields["accounts_same_address"],
            urban_rural_classification=fields["urban_rural_classification"],
        )
        persist_result(db, result, fields, audit_action="SCORE_CALCULATED")
        results.append(result)
        print(f"    {aid} -> {result.classification} ({result.equity_score:.1f})")

    db.commit()

    luxury = db.query(EquityResult).filter(EquityResult.flags.like("%LUXURY_IN_POVERTY_ZONE%")).count()
    summary_db = {
        "GREEN": db.query(EquityResult).filter(EquityResult.classification == Classification.GREEN).count(),
        "YELLOW": db.query(EquityResult).filter(EquityResult.classification == Classification.YELLOW).count(),
        "RED": db.query(EquityResult).filter(EquityResult.classification == Classification.RED).count(),
    }
    db.close()

    print(f"\n  Luxury-in-poverty flags: {luxury}")
    print("\n  Classification counts (database):")
    print(f"    GREEN: {summary_db.get('GREEN', 0)}")
    print(f"    YELLOW: {summary_db.get('YELLOW', 0)}")
    print(f"    RED: {summary_db.get('RED', 0)}")
    print("\n" + "=" * 70)
    print("  Done.")
    print("=" * 70)


if __name__ == "__main__":
    main()
