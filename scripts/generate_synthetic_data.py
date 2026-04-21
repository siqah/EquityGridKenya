#!/usr/bin/env python3
"""
EquityGrid Kenya — Synthetic Dataset Generator

Generates 100 realistic Kenyan household accounts with varying
poverty levels, token purchase patterns, and consumption profiles.

Includes 5 "Turkana Exception" accounts — luxury consumption in
high-poverty zones that must be flagged RED.

Usage:
    python -m scripts.generate_synthetic_data
    # or
    python scripts/generate_synthetic_data.py
"""

import json
import random
import sys
import os

# Add project root to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import requests

# Base URL for the API
API_BASE = "http://localhost:8000"


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
            "token_avg_amount": round(random.uniform(30, 80), 2),      # Very small purchases
            "token_frequency": random.randint(15, 25),                  # Frequent small buys
            "total_kwh": round(random.uniform(8, 30), 1),              # Lifeline range
            "peak_load_kw": round(random.uniform(0.2, 1.5), 2),       # No luxury appliances
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
            "peak_load_kw": round(random.uniform(2.0, 4.5), 2),       # Minor spikes
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
            "peak_load_kw": round(random.uniform(6.0, 15.0), 2),      # Heavy luxury
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
            "peak_load_kw": round(random.uniform(8.0, 18.0), 2),      # Heavy luxury in poverty zone!
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
    """Generate all synthetic accounts and submit via the batch API."""
    print("=" * 70)
    print("  EquityGrid Kenya — Synthetic Dataset Generator")
    print("  Generating 100 accounts across 6 scenarios")
    print("=" * 70)

    # Set random seed for reproducibility
    random.seed(42)

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

    # Submit via batch API
    print(f"\n  📡 Submitting to API at {API_BASE}/api/v1/score/batch ...")

    try:
        response = requests.post(
            f"{API_BASE}/api/v1/score/batch",
            json={"accounts": all_accounts},
            timeout=60,
        )
        response.raise_for_status()
        data = response.json()

        print(f"\n  ✅ Batch scoring complete!")
        print(f"  📊 Total processed: {data['total_processed']}")
        print(f"\n  Classification Summary:")
        print(f"    🟢 GREEN  (Subsidize):    {data['summary']['GREEN']}")
        print(f"    🟡 YELLOW (Standard):     {data['summary']['YELLOW']}")
        print(f"    🔴 RED    (Luxury/Anomaly): {data['summary']['RED']}")

        # Verify Turkana Exceptions
        turkana_exceptions = [
            r for r in data["results"]
            if "TURKANA_EXCEPTION" in r.get("flags", [])
        ]
        print(f"\n  🚨 Turkana Exceptions detected: {len(turkana_exceptions)}")
        for te in turkana_exceptions:
            print(f"    → Hash: {te['account_id_hash'][:16]}...")
            print(f"      Score: {te['equity_score']}, Class: {te['classification']}")
            print(f"      Tariff: {te['suggested_tariff_multiplier']}×")
            print(f"      Flags: {te['flags']}")

        # Show some sample results
        print(f"\n  📋 Sample Results (first 5):")
        for r in data["results"][:5]:
            emoji = {"GREEN": "🟢", "YELLOW": "🟡", "RED": "🔴"}[r["classification"]]
            print(
                f"    {emoji} {r['county']:15s} | "
                f"Score: {r['equity_score']:5.1f} | "
                f"{r['classification']:6s} | "
                f"Tariff: {r['suggested_tariff_multiplier']}×"
            )

        # Save full results to JSON
        output_file = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "synthetic_results.json"
        )
        with open(output_file, "w") as f:
            json.dump(data, f, indent=2)
        print(f"\n  💾 Full results saved to: {output_file}")

    except requests.ConnectionError:
        print(f"\n  ❌ ERROR: Cannot connect to {API_BASE}")
        print(f"  Make sure the API is running:")
        print(f"    uvicorn app.main:app --reload --port 8000")
        sys.exit(1)
    except requests.HTTPError as e:
        print(f"\n  ❌ HTTP Error: {e}")
        print(f"  Response: {e.response.text}")
        sys.exit(1)

    print("\n" + "=" * 70)
    print("  ✅ Synthetic dataset generation complete!")
    print("=" * 70)


if __name__ == "__main__":
    main()
