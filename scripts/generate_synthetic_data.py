#!/usr/bin/env python3
"""
EquityGrid Kenya — Synthetic Dataset Generator

Generates 100 realistic Kenyan household accounts with varying
poverty levels, token purchase patterns, and consumption profiles.

Includes 5 "Turkana Exception" accounts — luxury consumption in
high-poverty zones that must be flagged RED.

This script writes DIRECTLY to the database using the scoring engine
(no HTTP/requests dependency needed).

Usage:
    python scripts/generate_synthetic_data.py
"""

import json
import random
import sys
import os

# Add project root to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, init_db
from app.models import EquityResult, AuditTrail, Classification
from app.scoring.engine import calculate_equity_score
from datetime import datetime, timezone


def generate_account_id(prefix: str, index: int) -> str:
    """Generate a realistic KPLC-style account ID."""
    return f"KPLC-{prefix}-{index:04d}-2024"


def generate_deep_poverty_accounts(count: int = 30) -> list[dict]:
    """
    Scenario 1: Deep poverty, lifeline usage.
    Counties: Turkana, Mandera, Samburu, Wajir, Marsabit, etc.
    Expected classification: GREEN
    """
    counties = ["Turkana", "Mandera", "Samburu", "Wajir", "Marsabit", "Tana River", "Garissa"]
    accounts = []

    for i in range(count):
        accounts.append({
            "account_id": generate_account_id("DP", i + 1),
            "county": random.choice(counties),
            "token_avg_amount": round(random.uniform(30, 80), 2),
            "token_frequency": random.randint(15, 25),
            "total_kwh": round(random.uniform(8, 30), 1),
            "peak_load_kw": round(random.uniform(0.2, 1.5), 2),
        })

    return accounts


def generate_moderate_poverty_accounts(count: int = 25) -> list[dict]:
    """
    Scenario 2: Moderate poverty, standard usage.
    Counties: Kilifi, Busia, Kisumu, Kwale, Kakamega, etc.
    Expected classification: YELLOW
    """
    counties = ["Kilifi", "Busia", "Kisumu", "Kwale", "Kakamega", "Siaya", "Migori", "Homa Bay"]
    accounts = []

    for i in range(count):
        accounts.append({
            "account_id": generate_account_id("MP", i + 1),
            "county": random.choice(counties),
            "token_avg_amount": round(random.uniform(200, 500), 2),
            "token_frequency": random.randint(4, 10),
            "total_kwh": round(random.uniform(40, 120), 1),
            "peak_load_kw": round(random.uniform(1.0, 3.5), 2),
        })

    return accounts


def generate_urban_standard_accounts(count: int = 20) -> list[dict]:
    """
    Scenario 3: Urban standard usage.
    Counties: Nairobi, Mombasa, Nakuru, Kisumu.
    Expected classification: YELLOW
    """
    counties = ["Nairobi", "Mombasa", "Nakuru", "Kisumu"]
    accounts = []

    for i in range(count):
        accounts.append({
            "account_id": generate_account_id("US", i + 1),
            "county": random.choice(counties),
            "token_avg_amount": round(random.uniform(1000, 3000), 2),
            "token_frequency": random.randint(2, 4),
            "total_kwh": round(random.uniform(100, 250), 1),
            "peak_load_kw": round(random.uniform(2.0, 4.5), 2),
        })

    return accounts


def generate_urban_luxury_accounts(count: int = 15) -> list[dict]:
    """
    Scenario 4: Urban luxury consumption.
    Counties: Nairobi, Kiambu.
    Expected classification: RED
    """
    counties = ["Nairobi", "Kiambu"]
    accounts = []

    for i in range(count):
        accounts.append({
            "account_id": generate_account_id("UL", i + 1),
            "county": random.choice(counties),
            "token_avg_amount": round(random.uniform(5000, 15000), 2),
            "token_frequency": random.randint(1, 2),
            "total_kwh": round(random.uniform(300, 800), 1),
            "peak_load_kw": round(random.uniform(6.0, 15.0), 2),
        })

    return accounts


def generate_turkana_exception_accounts(count: int = 5) -> list[dict]:
    """
    Scenario 5: TURKANA EXCEPTION 🚨
    High-poverty county BUT luxury-level consumption.
    This is the critical anomaly detection case.

    These accounts are in Turkana (poverty index 87.5) but have:
    - Very high kWh consumption (400-900)
    - Heavy load spikes (>= 8 kW) indicating luxury appliances
    - Large token purchases (KSh 8000-20000)

    Expected classification: RED with TURKANA_EXCEPTION flag
    """
    accounts = []

    for i in range(count):
        accounts.append({
            "account_id": generate_account_id("TE", i + 1),
            "county": "Turkana",
            "token_avg_amount": round(random.uniform(8000, 20000), 2),
            "token_frequency": random.randint(1, 3),
            "total_kwh": round(random.uniform(400, 900), 1),
            "peak_load_kw": round(random.uniform(8.0, 18.0), 2),
        })

    return accounts


def generate_edge_case_accounts(count: int = 5) -> list[dict]:
    """
    Scenario 6: Edge cases — borderline accounts.
    These test the scoring boundaries.
    """
    accounts = [
        # Borderline GREEN/YELLOW — moderate poverty, very low consumption
        {
            "account_id": generate_account_id("EC", 1),
            "county": "Busia",
            "token_avg_amount": 150.0,
            "token_frequency": 12,
            "total_kwh": 35.0,
            "peak_load_kw": 1.8,
        },
        # Borderline YELLOW/RED — urban, high consumption but no spikes
        {
            "account_id": generate_account_id("EC", 2),
            "county": "Nairobi",
            "token_avg_amount": 4000.0,
            "token_frequency": 2,
            "total_kwh": 280.0,
            "peak_load_kw": 4.5,
        },
        # Near-Turkana-Exception — high poverty, moderate consumption, just under spike threshold
        {
            "account_id": generate_account_id("EC", 3),
            "county": "Marsabit",
            "token_avg_amount": 3000.0,
            "token_frequency": 3,
            "total_kwh": 180.0,
            "peak_load_kw": 4.8,  # Just under 5.0 threshold
        },
        # Zero consumption — new account or disconnected
        {
            "account_id": generate_account_id("EC", 4),
            "county": "Wajir",
            "token_avg_amount": 0.0,
            "token_frequency": 0,
            "total_kwh": 0.0,
            "peak_load_kw": 0.0,
        },
        # Unknown county — tests default poverty index
        {
            "account_id": generate_account_id("EC", 5),
            "county": "Unknown County",
            "token_avg_amount": 800.0,
            "token_frequency": 5,
            "total_kwh": 90.0,
            "peak_load_kw": 2.5,
        },
    ]

    return accounts


def main():
    """Generate all synthetic accounts and write directly to the database."""
    print("=" * 70)
    print("  EquityGrid Kenya — Synthetic Dataset Generator")
    print("  Generating 100 accounts across 6 scenarios")
    print("=" * 70)

    # Set random seed for reproducibility
    random.seed(42)

    # Initialize the database tables
    print("\n  ⚡ Initializing database...")
    init_db()

    # Open a database session
    db = SessionLocal()

    # Generate all scenarios
    all_accounts = []

    scenarios = [
        ("Deep Poverty (Lifeline)", generate_deep_poverty_accounts, 30),
        ("Moderate Poverty (Standard)", generate_moderate_poverty_accounts, 25),
        ("Urban Standard", generate_urban_standard_accounts, 20),
        ("Urban Luxury", generate_urban_luxury_accounts, 15),
        ("🚨 TURKANA EXCEPTION", generate_turkana_exception_accounts, 5),
        ("Edge Cases (Borderline)", generate_edge_case_accounts, 5),
    ]

    for name, generator, count in scenarios:
        accounts = generator(count)
        all_accounts.extend(accounts)
        print(f"\n  ✅ {name}: {len(accounts)} accounts generated")

    print(f"\n  📊 Total accounts: {len(all_accounts)}")
    print("-" * 70)

    # Score each account and persist to DB
    print(f"\n  📡 Scoring and persisting to database...")

    results = []
    summary = {"GREEN": 0, "YELLOW": 0, "RED": 0}

    for account in all_accounts:
        # Run scoring engine
        result = calculate_equity_score(
            account_id=account["account_id"],
            county=account["county"],
            token_avg_amount=account["token_avg_amount"],
            token_frequency=account["token_frequency"],
            total_kwh=account["total_kwh"],
            peak_load_kw=account["peak_load_kw"],
        )

        # Persist to database
        flags_json = json.dumps(result.flags)

        existing = (
            db.query(EquityResult)
            .filter(EquityResult.account_id_hash == result.account_id_hash)
            .first()
        )

        if existing:
            existing.county = result.county
            existing.poverty_index = result.poverty_index
            existing.token_avg_amount = result.token_avg_amount
            existing.token_frequency = result.token_frequency
            existing.total_kwh = result.total_kwh
            existing.peak_load_kw = result.peak_load_kw
            existing.has_load_spike = result.has_load_spike
            existing.geographic_score = result.geographic_score
            existing.token_score = result.token_score
            existing.monthly_kwh_equity_score = result.monthly_kwh_equity_score
            existing.location_equity_score = result.location_equity_score
            existing.load_profile_score = result.load_profile_score
            existing.consumption_score = result.consumption_score
            existing.location_type = result.location_type
            existing.location_subcounty = result.location_subcounty
            existing.geo_layer_fingerprint = result.geo_layer_fingerprint
            existing.equity_score = result.equity_score
            existing.classification = Classification(result.classification)
            existing.suggested_tariff_multiplier = result.suggested_tariff_multiplier
            existing.flags = flags_json
            existing.created_at = datetime.now(timezone.utc)
        else:
            db_result = EquityResult(
                account_id_hash=result.account_id_hash,
                county=result.county,
                poverty_index=result.poverty_index,
                token_avg_amount=result.token_avg_amount,
                token_frequency=result.token_frequency,
                total_kwh=result.total_kwh,
                peak_load_kw=result.peak_load_kw,
                has_load_spike=result.has_load_spike,
                geographic_score=result.geographic_score,
                token_score=result.token_score,
                monthly_kwh_equity_score=result.monthly_kwh_equity_score,
                location_equity_score=result.location_equity_score,
                load_profile_score=result.load_profile_score,
                consumption_score=result.consumption_score,
                location_type=result.location_type,
                location_subcounty=result.location_subcounty,
                geo_layer_fingerprint=result.geo_layer_fingerprint,
                equity_score=result.equity_score,
                classification=Classification(result.classification),
                suggested_tariff_multiplier=result.suggested_tariff_multiplier,
                flags=flags_json,
            )
            db.add(db_result)

        # Audit trail
        audit_entry = AuditTrail(
            account_id_hash=result.account_id_hash,
            action="SCORE_CALCULATED",
            details=json.dumps({
                "equity_score": result.equity_score,
                "classification": result.classification,
                "tariff_multiplier": result.suggested_tariff_multiplier,
                "flags": result.flags,
            }),
        )
        db.add(audit_entry)

        summary[result.classification] += 1
        results.append(result)

    db.commit()

    print(f"\n  ✅ Batch scoring complete!")
    print(f"  📊 Total processed: {len(results)}")
    print(f"\n  Classification Summary:")
    print(f"    🟢 GREEN  (Subsidize):      {summary['GREEN']}")
    print(f"    🟡 YELLOW (Standard):       {summary['YELLOW']}")
    print(f"    🔴 RED    (Luxury/Anomaly): {summary['RED']}")

    # Verify Turkana Exceptions
    turkana_exceptions = [r for r in results if "TURKANA_EXCEPTION" in r.flags]
    print(f"\n  🚨 Turkana Exceptions detected: {len(turkana_exceptions)}")
    for te in turkana_exceptions:
        print(f"    → Hash: {te.account_id_hash[:16]}...")
        print(f"      Score: {te.equity_score}, Class: {te.classification}")
        print(f"      Tariff: {te.suggested_tariff_multiplier}×")
        print(f"      Flags: {te.flags}")
        print(f"      kWh: {te.total_kwh}, Peak: {te.peak_load_kw} kW")

    # Show sample results
    print(f"\n  📋 Sample Results (first 10):")
    for r in results[:10]:
        emoji = {"GREEN": "🟢", "YELLOW": "🟡", "RED": "🔴"}[r.classification]
        print(
            f"    {emoji} {r.county:15s} | "
            f"Score: {r.equity_score:5.1f} | "
            f"{r.classification:6s} | "
            f"Tariff: {r.suggested_tariff_multiplier}× | "
            f"kWh: {r.total_kwh:6.1f} | "
            f"Peak: {r.peak_load_kw:4.1f}kW"
        )

    # Save full results to JSON
    output_file = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "synthetic_results.json"
    )
    export_data = {
        "total_processed": len(results),
        "summary": summary,
        "results": [
            {
                "account_id_hash": r.account_id_hash,
                "county": r.county,
                "poverty_index": r.poverty_index,
                "equity_score": r.equity_score,
                "classification": r.classification,
                "suggested_tariff_multiplier": r.suggested_tariff_multiplier,
                "flags": r.flags,
                "signal_breakdown": {
                    "geographic_score": r.geographic_score,
                    "token_score": r.token_score,
                    "monthly_kwh_equity_score": r.monthly_kwh_equity_score,
                    "location_equity_score": r.location_equity_score,
                    "consumption_score": r.consumption_score,
                },
                "inputs": {
                    "token_avg_amount": r.token_avg_amount,
                    "token_frequency": r.token_frequency,
                    "total_kwh": r.total_kwh,
                    "peak_load_kw": r.peak_load_kw,
                    "has_load_spike": r.has_load_spike,
                },
            }
            for r in results
        ],
    }
    with open(output_file, "w") as f:
        json.dump(export_data, f, indent=2)
    print(f"\n  💾 Full results saved to: {output_file}")

    db.close()

    print("\n" + "=" * 70)
    print("  ✅ Synthetic dataset generation complete!")
    print("=" * 70)


if __name__ == "__main__":
    main()
