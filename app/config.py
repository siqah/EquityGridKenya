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
    DATABASE_URL: str = "sqlite:///./equitygrid.db"

    # Six-variable model weights (must sum to 1.0)
    WEIGHT_CONSUMPTION_PER_CAPITA: float = 0.25
    WEIGHT_PAYMENT_CONSISTENCY: float = 0.22
    WEIGHT_NSPS: float = 0.18
    WEIGHT_PEAK_DEMAND_RATIO: float = 0.15
    WEIGHT_UPGRADE_HISTORY: float = 0.12
    WEIGHT_ACTIVE_ACCOUNTS: float = 0.08

    # National benchmark (kWh per person per month) for capita proxy
    NATIONAL_CAPITA_BENCHMARK_KWH: float = 22.0

    # Classification on final score (higher = more affluent / cross-subsidy risk)
    SCORE_MAX_GREEN: float = 40.0   # score <= this → GREEN
    SCORE_MAX_YELLOW: float = 70.0  # score <= this → YELLOW; else RED

    # Tariff Multipliers
    TARIFF_GREEN: float = 0.60
    TARIFF_YELLOW: float = 1.00
    TARIFF_RED: float = 1.40

    @model_validator(mode="after")
    def _weights_sum_to_one(self) -> "Settings":
        total = (
            self.WEIGHT_CONSUMPTION_PER_CAPITA
            + self.WEIGHT_PAYMENT_CONSISTENCY
            + self.WEIGHT_NSPS
            + self.WEIGHT_PEAK_DEMAND_RATIO
            + self.WEIGHT_UPGRADE_HISTORY
            + self.WEIGHT_ACTIVE_ACCOUNTS
        )
        if abs(total - 1.0) > 1e-5:
            raise ValueError(f"Six scoring weights must sum to 1.0; got {total}.")
        return self

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()
