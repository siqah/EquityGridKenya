"""
EquityGrid Kenya — SQLAlchemy ORM Models

Defines the EquityResult and AuditTrail tables.
All account IDs stored as SHA-256 hashes for privacy.
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
    GREEN = "GREEN"    # Subsidize — genuine energy poverty
    YELLOW = "YELLOW"  # Standard — no adjustment needed
    RED = "RED"        # Luxury/Anomaly — cross-subsidy contributor


class EquityResult(Base):
    """
    Stores the equity scoring result for each household account.
    Account IDs are SHA-256 hashed — no raw PII is stored.
    """
    __tablename__ = "equity_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    account_id_hash = Column(String(64), unique=True, nullable=False, index=True)

    # Geographic Signal
    county = Column(String(50), nullable=False)
    poverty_index = Column(Float, nullable=False)

    # Token Purchase Signal
    token_avg_amount = Column(Float, nullable=False)      # KSh per purchase
    token_frequency = Column(Integer, nullable=False)      # purchases per month

    # Consumption Signal
    total_kwh = Column(Float, nullable=False)
    peak_load_kw = Column(Float, nullable=False)
    has_load_spike = Column(Boolean, default=False)

    # Computed Scores (0-100 each)
    geographic_score = Column(Float, nullable=False)
    token_score = Column(Float, nullable=False)
    # Legacy name: stores peak-load / spike profile (Variable — load layer)
    consumption_score = Column(Float, nullable=False)
    monthly_kwh_equity_score = Column(Float, nullable=False, default=0.0)
    location_equity_score = Column(Float, nullable=False, default=0.0)
    load_profile_score = Column(Float, nullable=False, default=0.0)
    location_type = Column(String(32), nullable=False, default="county_aggregate")
    location_subcounty = Column(String(120), nullable=True)
    geo_layer_fingerprint = Column(String(32), nullable=True)

    # Final Result
    equity_score = Column(Float, nullable=False)
    classification = Column(SAEnum(Classification), nullable=False)
    suggested_tariff_multiplier = Column(Float, nullable=False)
    flags = Column(Text, default="")  # JSON string for flags like "TURKANA_EXCEPTION"

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Composite index for common query patterns
    __table_args__ = (
        Index("ix_classification_county", "classification", "county"),
    )

    def __repr__(self):
        return (
            f"<EquityResult(hash={self.account_id_hash[:12]}..., "
            f"county={self.county}, "
            f"classification={self.classification.value}, "
            f"score={self.equity_score:.1f})>"
        )


class AuditTrail(Base):
    """
    Immutable audit log for all scoring operations.
    Tracks every score calculation and reclassification.
    """
    __tablename__ = "audit_trail"

    id = Column(Integer, primary_key=True, autoincrement=True)
    account_id_hash = Column(String(64), nullable=False, index=True)
    action = Column(String(50), nullable=False)  # SCORE_CALCULATED, RECLASSIFIED, etc.
    details = Column(Text, default="")            # JSON string with action details
    timestamp = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self):
        return (
            f"<AuditTrail(hash={self.account_id_hash[:12]}..., "
            f"action={self.action}, "
            f"time={self.timestamp})>"
        )
