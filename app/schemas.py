"""
EquityGrid Kenya — Pydantic Request/Response Schemas

Six-variable equity model.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator, model_validator

from app.scoring.engine import default_nsps_coverage_for_county


class AccountInput(BaseModel):
    """Household inputs for the six-variable equity score."""

    account_id: str = Field(..., min_length=1, max_length=100)
    county: str = Field(..., min_length=1, max_length=80)
    ward_avg_household_size: float = Field(..., ge=0.5, le=20.0)
    kwh_month: float = Field(..., ge=0.0)
    avg_disconnection_days_per_month: float = Field(..., ge=0.0, le=31.0)
    nsps_registered: bool = Field(..., description="Verified NSPS social protection beneficiary")
    county_nsps_coverage_rate: Optional[float] = Field(
        None,
        ge=0.0,
        le=1.0,
        description="County NSPS coverage prior (0–1); defaults from lookup table if omitted",
    )
    peak_demand_ratio: float = Field(..., ge=0.0, le=1.0, description="Share of kWh in evening peak (6pm–10pm)")
    has_three_phase: bool = Field(..., description="Three-phase service connection")
    connection_capacity_kva: float = Field(..., ge=0.0, le=200.0)
    accounts_same_address: int = Field(..., ge=1, le=50)
    urban_rural_classification: str = Field(
        ...,
        description="Urban, Peri-urban, or Rural — contextual display only (not scored)",
    )

    @field_validator("county")
    @classmethod
    def normalize_county(cls, v: str) -> str:
        return v.strip().title()

    @field_validator("urban_rural_classification")
    @classmethod
    def normalize_urban(cls, v: str) -> str:
        t = v.strip()
        if t.lower() in ("peri-urban", "periurban", "peri_urban"):
            return "Peri-urban"
        if t.lower() == "urban":
            return "Urban"
        if t.lower() == "rural":
            return "Rural"
        return t

    @model_validator(mode="after")
    def fill_nsps_coverage(self) -> "AccountInput":
        if self.county_nsps_coverage_rate is None:
            return self.model_copy(
                update={
                    "county_nsps_coverage_rate": default_nsps_coverage_for_county(
                        self.county
                    ),
                },
            )
        return self


class BatchScoreRequest(BaseModel):
    accounts: list[AccountInput] = Field(..., min_length=1, max_length=1000)


class SignalBreakdown(BaseModel):
    consumption_per_capita: float = Field(..., description="Variable 1 — consumption per capita proxy (0–100)")
    payment_consistency: float = Field(..., description="Variable 2 — payment / disconnection consistency (0–100)")
    nsps_status: float = Field(..., description="Variable 3 — NSPS registration status (0–100)")
    peak_demand_ratio: float = Field(..., description="Variable 4 — evening peak demand shape (0–100)")
    upgrade_history: float = Field(..., description="Variable 5 — connection upgrade / capacity (0–100)")
    active_accounts: float = Field(..., description="Variable 6 — meters at same address (0–100)")


class EquityScoreResponse(BaseModel):
    account_id_hash: str
    county: str
    equity_score: float = Field(..., ge=0.0, le=100.0, description="Final weighted score (higher = more affluent)")
    classification: str
    suggested_tariff_multiplier: float
    flags: list[str] = Field(default_factory=list)
    signal_breakdown: SignalBreakdown
    explanation: str


class BatchScoreResponse(BaseModel):
    total_processed: int
    summary: dict[str, int]
    results: list[EquityScoreResponse]


class StatsResponse(BaseModel):
    total_accounts: int
    classification_counts: dict[str, int]
    average_equity_score: float
    turkana_exceptions: int = Field(
        ...,
        description="Count of accounts flagged LUXURY_IN_POVERTY_ZONE (priority zone leakage)",
    )
    counties_covered: int


class ResultRecord(BaseModel):
    id: int
    account_id_hash: str
    county: str
    ward_avg_household_size: float
    kwh_month: float
    avg_disconnection_days_per_month: float
    nsps_registered: bool
    county_nsps_coverage_rate: float
    peak_demand_ratio: float
    has_three_phase: bool
    connection_capacity_kva: float
    accounts_same_address: int
    urban_rural_classification: str
    score_consumption_per_capita: float
    score_payment_consistency: float
    score_nsps_status: float
    score_peak_demand_ratio: float
    score_upgrade_history: float
    score_active_accounts: float
    equity_score: float
    classification: str
    suggested_tariff_multiplier: float
    flags: list[str]
    explanation: str
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedResults(BaseModel):
    total: int
    page: int
    per_page: int
    results: list[ResultRecord]


class HealthResponse(BaseModel):
    status: str = "healthy"
    app_name: str
    version: str
    database: str = "connected"
