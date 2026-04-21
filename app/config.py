"""
EquityGrid Kenya — Application Configuration

Uses pydantic-settings for environment variable management.
SQLite for local development, PostgreSQL-compatible via SQLAlchemy.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables or .env file."""

    # Application
    APP_NAME: str = "EquityGrid Kenya"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True

    # Database — SQLite for local dev, swap to PostgreSQL URI for production
    # e.g. "postgresql://user:pass@localhost:5432/equitygrid"
    DATABASE_URL: str = "sqlite:///./equitygrid.db"

    # Scoring Engine Weights
    WEIGHT_GEOGRAPHIC: float = 0.40
    WEIGHT_TOKEN: float = 0.30
    WEIGHT_CONSUMPTION: float = 0.30

    # Classification Thresholds
    THRESHOLD_GREEN: float = 70.0   # Score >= 70 → GREEN (subsidize)
    THRESHOLD_YELLOW: float = 40.0  # Score >= 40 → YELLOW (standard)
    # Score < 40 → RED (luxury/anomaly)

    # Tariff Multipliers
    TARIFF_GREEN: float = 0.60
    TARIFF_YELLOW: float = 1.00
    TARIFF_RED: float = 1.40

    # Load Spike Detection
    LOAD_SPIKE_THRESHOLD_KW: float = 5.0
    HIGH_CONSUMPTION_KWH: float = 200.0

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()
