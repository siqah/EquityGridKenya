"""
EquityGrid Kenya — Application Configuration

Uses pydantic-settings for environment variable management.
SQLite for local development, PostgreSQL-compatible via SQLAlchemy.
"""

from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables or .env file."""

    # Application
    APP_NAME: str = "EquityGrid Kenya"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True

    # Database — SQLite for local dev, swap to PostgreSQL URI for production
    # e.g. "postgresql://user:pass@localhost:5432/equitygrid"
    DATABASE_URL: str = "sqlite:///./equitygrid.db"

    # Scoring Engine Weights (must sum to 1.0)
    # Baseline index (Variable 5) — KNBS / WB county headcount
    WEIGHT_GEOGRAPHIC: float = 0.25
    # Token purchase pattern
    WEIGHT_TOKEN: float = 0.30
    # Variable 1 — monthly kWh lifeline vs high-consumption band (capped influence)
    WEIGHT_MONTHLY_KWH: float = 0.10
    # Variable 2 — KNBS-linked location type (hashed geospatial layer)
    WEIGHT_LOCATION: float = 0.10
    # Peak load / high-draw appliance spike signal (residual consumption layer)
    WEIGHT_LOAD_PROFILE: float = 0.25

    # Pepper for geographic-layer coordinate hashing (set in production)
    GEOSPATIAL_LAYER_PEPPER: str = ""

    # Classification Thresholds
    THRESHOLD_GREEN: float = 70.0   # Score >= 70 → GREEN (subsidize)
    THRESHOLD_YELLOW: float = 40.0  # Score >= 40 → YELLOW (standard)
    # Score < 40 → RED (high-draw/anomaly)

    # Tariff Multipliers
    TARIFF_GREEN: float = 0.60
    TARIFF_YELLOW: float = 1.00
    TARIFF_RED: float = 1.40

    # Load Spike Detection
    LOAD_SPIKE_THRESHOLD_KW: float = 5.0
    HIGH_CONSUMPTION_KWH: float = 200.0

    @model_validator(mode="after")
    def _weights_sum_to_one(self) -> "Settings":
        total = (
            self.WEIGHT_GEOGRAPHIC
            + self.WEIGHT_TOKEN
            + self.WEIGHT_MONTHLY_KWH
            + self.WEIGHT_LOCATION
            + self.WEIGHT_LOAD_PROFILE
        )
        if abs(total - 1.0) > 1e-5:
            raise ValueError(
                "Scoring weights must sum to 1.0; "
                f"got {total} from geographic+token+monthly_kwh+location+load_profile."
            )
        return self

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()
