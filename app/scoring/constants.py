"""
EquityGrid Kenya — Kenya-Specific Reference Data & Thresholds

County-level poverty indices based on KNBS Comprehensive Poverty Report
and World Bank Kenya Poverty Assessment. These are approximate headcount
poverty rates used for the Geographic Signal.

Token and consumption thresholds are based on KPLC tariff structures
and EPRA consumption baselines for Kenyan households.
"""

# ─── County Poverty Index (0-100) ────────────────────────────────────────────
# Source: KNBS Comprehensive Poverty Report 2020, World Bank Kenya Assessment
# Values represent approximate overall poverty headcount rate (%)
# Higher value = deeper poverty = more subsidy needed

COUNTY_POVERTY_INDEX: dict[str, float] = {
    # ── Arid & Semi-Arid Lands (ASAL) — High Poverty ──
    "Turkana": 87.5,
    "Mandera": 85.8,
    "Wajir": 84.2,
    "Marsabit": 76.1,
    "Samburu": 75.6,
    "Tana River": 72.9,
    "Garissa": 70.3,
    "Isiolo": 65.8,
    "West Pokot": 66.4,

    # ── Coastal & Western — Medium-High Poverty ──
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

    # ── Central & Rift Valley — Medium Poverty ──
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

    # ── Urban Centers — Lower Poverty ──
    "Machakos": 34.2,
    "Makueni": 41.3,
    "Kitui": 55.8,

    # ── Major Urban — Low Poverty ──
    "Mombasa": 33.4,
    "Nakuru": 28.7,
    "Kiambu": 22.1,
    "Nairobi": 16.7,
}

# Default poverty index for unknown counties
DEFAULT_POVERTY_INDEX: float = 50.0


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
# Based on KPLC Domestic tariff brackets and EPRA baselines

CONSUMPTION_LIFELINE_KWH: float = 30.0    # KPLC Domestic 1 (lifeline) ceiling
CONSUMPTION_STANDARD_KWH: float = 200.0   # Domestic 2 typical upper range
CONSUMPTION_HIGH_KWH: float = 500.0       # High consumption indicator
CONSUMPTION_MAX_KWH: float = 1000.0       # Max for normalization

# Load spike threshold (instantaneous kW)
LOAD_SPIKE_THRESHOLD_KW: float = 5.0      # Indicates luxury appliances (AC, heater, oven)
LOAD_SPIKE_HEAVY_KW: float = 8.0          # Heavy luxury load


# ─── Turkana Exception Parameters ───────────────────────────────────────────
# High-poverty counties where luxury consumption is an anomaly flag

HIGH_POVERTY_THRESHOLD: float = 60.0       # Counties above this are "high poverty"
TURKANA_EXCEPTION_OVERRIDE_KWH: float = 200.0  # kWh threshold for override
TURKANA_EXCEPTION_OVERRIDE_KW: float = 5.0     # Peak load threshold for override


# ─── Counties classified as high-poverty zones ──────────────────────────────

HIGH_POVERTY_COUNTIES: list[str] = [
    county for county, index in COUNTY_POVERTY_INDEX.items()
    if index >= HIGH_POVERTY_THRESHOLD
]
