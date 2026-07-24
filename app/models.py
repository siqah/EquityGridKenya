"""
EquityGrid Kenya — SQLAlchemy ORM Models

Six-variable equity model. Account IDs stored as SHA-256 hashes.
"""

import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    Text,
    Enum as SAEnum,
    Index,
)

from app.database import Base


class Classification(enum.Enum):
    """Equity classification categories."""
    GREEN = "GREEN"
    YELLOW = "YELLOW"
    RED = "RED"


class EquityResult(Base):
    """
    Stores inputs and scores for the 6-variable equity model.
    """
    __tablename__ = "equity_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    account_id_hash = Column(String(64), unique=True, nullable=False, index=True)

    county = Column(String(80), nullable=False)
    ward_avg_household_size = Column(Float, nullable=False)
    kwh_month = Column(Float, nullable=False)
    avg_disconnection_days_per_month = Column(Float, nullable=False)
    nsps_registered = Column(Boolean, nullable=False, default=False)
    county_nsps_coverage_rate = Column(Float, nullable=False)
    peak_demand_ratio = Column(Float, nullable=False)
    has_three_phase = Column(Boolean, nullable=False, default=False)
    connection_capacity_kva = Column(Float, nullable=False)
    accounts_same_address = Column(Integer, nullable=False, default=1)
    urban_rural_classification = Column(String(24), nullable=False, default="Rural")

    # Sub-scores 0–100
    score_consumption_per_capita = Column(Float, nullable=False)
    score_payment_consistency = Column(Float, nullable=False)
    score_nsps_status = Column(Float, nullable=False)
    score_peak_demand_ratio = Column(Float, nullable=False)
    score_upgrade_history = Column(Float, nullable=False)
    score_active_accounts = Column(Float, nullable=False)

    equity_score = Column(Float, nullable=False)
    classification = Column(SAEnum(Classification), nullable=False)
    suggested_tariff_multiplier = Column(Float, nullable=False)
    flags = Column(Text, default="")

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        Index("ix_classification_county", "classification", "county"),
    )

    def __repr__(self) -> str:
        return (
            f"<EquityResult(hash={self.account_id_hash[:12]}..., "
            f"county={self.county}, cls={self.classification.value}, "
            f"score={self.equity_score:.1f})>"
        )


class AuditTrail(Base):
    """Immutable audit log for scoring operations."""
    __tablename__ = "audit_trail"

    id = Column(Integer, primary_key=True, autoincrement=True)
    account_id_hash = Column(String(64), nullable=False, index=True)
    action = Column(String(50), nullable=False)
    details = Column(Text, default="")
    timestamp = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<AuditTrail(hash={self.account_id_hash[:12]}..., action={self.action})>"
