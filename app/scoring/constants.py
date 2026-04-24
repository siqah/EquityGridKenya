"""
EquityGrid Kenya — Kenya-Specific Reference Data & Thresholds

County-level baseline indices based on KNBS Comprehensive Poverty Report
and World Bank Kenya Poverty Assessment. These are approximate headcount
rates used for the Geographic Signal.

Token and consumption thresholds are based on KPLC tariff structures
and EPRA consumption baselines for Kenyan households.
"""

# ─── County Baseline Index (0-100) ────────────────────────────────────────────
# Source: KNBS Comprehensive Poverty Report 2020, World Bank Kenya Assessment
# Values represent approximate overall baseline need rate (%)
# Higher value = deeper need = more subsidy priority

COUNTY_BASELINE_INDEX: dict[str, float] = {
    # ── Arid & Semi-Arid Lands (ASAL) — High Priority ──
    "Turkana": 87.5,
    "Mandera": 85.8,
    "Wajir": 84.2,
    "Marsabit": 76.1,
    "Samburu": 75.6,
    "Tana River": 72.9,
    "Garissa": 70.3,
    "Isiolo": 65.8,
    "West Pokot": 66.4,

    # ── Coastal & Western — Medium-High Priority ──
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

    # ── Central & Rift Valley — Medium Priority ──
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

    # ── Urban Centers — Lower Priority ──
    "Machakos": 34.2,
    "Makueni": 41.3,
    "Kitui": 55.8,

    # ── Major Urban — Low Priority ──
    "Mombasa": 33.4,
    "Nakuru": 28.7,
    "Kiambu": 22.1,
    "Nairobi": 16.7,
}

# Default baseline index for unknown counties
DEFAULT_BASELINE_INDEX: float = 50.0


# ─── Token Purchase Thresholds ───────────────────────────────────────────────
# Based on KPLC tariff categories and observed purchasing behavior

# Average amount per purchase (KSh)
TOKEN_AMOUNT_LIFELINE: float = 100.0     # Very small purchases (KSh <100)
TOKEN_AMOUNT_LOW: float = 500.0          # Low-income typical (KSh 100-500)
TOKEN_AMOUNT_STANDARD: float = 2000.0    # Middle-income (KSh 500-2000)
TOKEN_AMOUNT_PREMIUM: float = 5000.0     # Above this = premium consumer

# Max reasonable values for normalization
TOKEN_AMOUNT_MAX: float = 20000.0        # Max expected monthly token spend
TOKEN_FREQUENCY_MAX: int = 30            # Max expected purchases per month (daily buying)


# ─── Consumption Thresholds ──────────────────────────────────────────────────
# Based on KPLC Domestic tariff brackets and EPRA baselines.
#
# Variable 1 (monthly kWh) is benchmarked alongside national system stress:
# ~2,439.06 MW Kenya system peak demand (2025/26 planning context) informs the
# interpretation of "high" household draw during peak hours vs lifeline tiers.

KENYA_SYSTEM_PEAK_DEMAND_MW_2025_26: float = 2439.06

CONSUMPTION_LIFELINE_KWH: float = 30.0    # KPLC Domestic 1 (lifeline) ceiling
CONSUMPTION_STANDARD_KWH: float = 200.0   # Domestic 2 typical upper range
CONSUMPTION_HIGH_KWH: float = 500.0       # High consumption indicator
CONSUMPTION_MAX_KWH: float = 1000.0       # Max for normalization

# Load spike threshold (instantaneous kW)
LOAD_SPIKE_THRESHOLD_KW: float = 5.0      # Indicates high-draw appliances (AC, heater, oven)
LOAD_SPIKE_HEAVY_KW: float = 8.0          # Heavy high-draw load


# ─── Turkana Exception Parameters ───────────────────────────────────────────
# High-priority counties where high-draw consumption is an anomaly flag

HIGH_PRIORITY_THRESHOLD: float = 60.0       # Counties above this are "high priority"
TURKANA_EXCEPTION_OVERRIDE_KWH: float = 200.0  # kWh threshold for override
TURKANA_EXCEPTION_OVERRIDE_KW: float = 5.0     # Peak load threshold for override


# ─── Counties classified as high-priority zones ──────────────────────────────

HIGH_PRIORITY_COUNTIES: list[str] = [
    county for county, index in COUNTY_BASELINE_INDEX.items()
    if index >= HIGH_PRIORITY_THRESHOLD
]
