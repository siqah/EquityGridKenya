"""
EquityGrid Kenya — Pydantic Request/Response Schemas

Handles validation, serialization, and API documentation.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


# ─── Request Schemas ─────────────────────────────────────────────────────────


class AccountInput(BaseModel):
    """Input data for scoring a single household account."""

    account_id: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Raw account identifier (will be SHA-256 hashed internally)",
        examples=["KPLC-001-TRK-2024"],
    )
    county: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Kenya county name",
        examples=["Turkana", "Nairobi", "Mombasa"],
    )
    token_avg_amount: float = Field(
        ...,
        ge=0,
        description="Average token purchase amount in KSh",
        examples=[50.0, 500.0, 5000.0],
    )
    token_frequency: int = Field(
        ...,
        ge=0,
        description="Number of token purchases per month",
        examples=[20, 5, 2],
    )
    total_kwh: float = Field(
        ...,
        ge=0,
        description="Total monthly electricity consumption in kWh",
        examples=[25.0, 100.0, 500.0],
    )
    peak_load_kw: float = Field(
        ...,
        ge=0,
        description="Peak instantaneous load in kW (luxury appliance indicator)",
        examples=[0.5, 2.0, 8.0],
    )

    @field_validator("county")
    @classmethod
    def normalize_county(cls, v: str) -> str:
        """Normalize county name to title case."""
        return v.strip().title()


class BatchScoreRequest(BaseModel):
    """Request body for batch scoring multiple accounts."""

    accounts: list[AccountInput] = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="List of accounts to score (max 1000 per batch)",
    )


# ─── Response Schemas ────────────────────────────────────────────────────────


class SignalBreakdown(BaseModel):
    """Detailed breakdown of individual signal scores."""

    geographic_score: float = Field(..., description="Geographic/poverty signal (0-100)")
    token_score: float = Field(..., description="Token purchase pattern signal (0-100)")
    consumption_score: float = Field(..., description="Consumption/load signal (0-100)")


class EquityScoreResponse(BaseModel):
    """Response for a single scored account."""

    account_id_hash: str = Field(
        ...,
        description="SHA-256 hash of the account ID",
    )
    county: str
    equity_score: float = Field(
        ...,
        ge=0,
        le=100,
        description="Final weighted equity score (0-100)",
    )
    classification: str = Field(
        ...,
        description="GREEN (subsidize), YELLOW (standard), or RED (luxury/anomaly)",
    )
    suggested_tariff_multiplier: float = Field(
        ...,
        description="Tariff multiplier: 0.60 (GREEN), 1.00 (YELLOW), 1.40 (RED)",
    )
    flags: list[str] = Field(
        default_factory=list,
        description="Special flags, e.g. ['TURKANA_EXCEPTION']",
    )
    signal_breakdown: SignalBreakdown


class BatchScoreResponse(BaseModel):
    """Response for batch scoring."""

    total_processed: int
    summary: dict[str, int] = Field(
        ...,
        description="Count by classification: {'GREEN': n, 'YELLOW': n, 'RED': n}",
    )
    results: list[EquityScoreResponse]


class StatsResponse(BaseModel):
    """Summary statistics across all scored accounts."""

    total_accounts: int
    classification_counts: dict[str, int]
    average_equity_score: float
    turkana_exceptions: int
    counties_covered: int


class ResultRecord(BaseModel):
    """Full result record from database, including metadata."""

    id: int
    account_id_hash: str
    county: str
    poverty_index: float
    token_avg_amount: float
    token_frequency: int
    total_kwh: float
    peak_load_kw: float
    has_load_spike: bool
    geographic_score: float
    token_score: float
    consumption_score: float
    equity_score: float
    classification: str
    suggested_tariff_multiplier: float
    flags: list[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedResults(BaseModel):
    """Paginated list of results."""

    total: int
    page: int
    per_page: int
    results: list[ResultRecord]


class HealthResponse(BaseModel):
    """Health check response."""

    status: str = "healthy"
    app_name: str
    version: str
    database: str = "connected"
