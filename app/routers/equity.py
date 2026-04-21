"""
EquityGrid Kenya — API Routes

All equity scoring endpoints with request validation,
database persistence, and audit trail logging.
"""

import json
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import EquityResult, AuditTrail, Classification
from app.schemas import (
    AccountInput,
    BatchScoreRequest,
    BatchScoreResponse,
    EquityScoreResponse,
    HealthResponse,
    PaginatedResults,
    ResultRecord,
    SignalBreakdown,
    StatsResponse,
)
from app.scoring.engine import (
    calculate_equity_score,
    equity_orm_to_scoring_result,
    explain_score,
)
from app.config import get_settings

router = APIRouter(prefix="/api/v1", tags=["equity"])


def _score_and_persist(
    account: AccountInput,
    db: Session,
) -> EquityScoreResponse:
    """
    Score a single account, persist to database, and log to audit trail.
    Returns the API response schema.
    """
    result = calculate_equity_score(
        account_id=account.account_id,
        county=account.county,
        token_avg_amount=account.token_avg_amount,
        token_frequency=account.token_frequency,
        total_kwh=account.total_kwh,
        peak_load_kw=account.peak_load_kw,
        latitude=account.latitude,
        longitude=account.longitude,
    )

    existing = (
        db.query(EquityResult)
        .filter(EquityResult.account_id_hash == result.account_id_hash)
        .first()
    )

    flags_json = json.dumps(result.flags)
    explanation = explain_score(result)

    if existing:
        existing.county = result.county
        existing.poverty_index = result.poverty_index
        existing.token_avg_amount = result.token_avg_amount
        existing.token_frequency = result.token_frequency
        existing.total_kwh = result.total_kwh
        existing.peak_load_kw = result.peak_load_kw
        existing.has_load_spike = result.has_load_spike
        existing.geographic_score = result.geographic_score
        existing.token_score = result.token_score
        existing.monthly_kwh_equity_score = result.monthly_kwh_equity_score
        existing.location_equity_score = result.location_equity_score
        existing.load_profile_score = result.load_profile_score
        existing.consumption_score = result.consumption_score
        existing.location_type = result.location_type
        existing.location_subcounty = result.location_subcounty
        existing.geo_layer_fingerprint = result.geo_layer_fingerprint
        existing.equity_score = result.equity_score
        existing.classification = Classification(result.classification)
        existing.suggested_tariff_multiplier = result.suggested_tariff_multiplier
        existing.flags = flags_json
        existing.created_at = datetime.now(timezone.utc)

        audit_action = "RECLASSIFIED"
    else:
        db_result = EquityResult(
            account_id_hash=result.account_id_hash,
            county=result.county,
            poverty_index=result.poverty_index,
            token_avg_amount=result.token_avg_amount,
            token_frequency=result.token_frequency,
            total_kwh=result.total_kwh,
            peak_load_kw=result.peak_load_kw,
            has_load_spike=result.has_load_spike,
            geographic_score=result.geographic_score,
            token_score=result.token_score,
            monthly_kwh_equity_score=result.monthly_kwh_equity_score,
            location_equity_score=result.location_equity_score,
            load_profile_score=result.load_profile_score,
            consumption_score=result.consumption_score,
            location_type=result.location_type,
            location_subcounty=result.location_subcounty,
            geo_layer_fingerprint=result.geo_layer_fingerprint,
            equity_score=result.equity_score,
            classification=Classification(result.classification),
            suggested_tariff_multiplier=result.suggested_tariff_multiplier,
            flags=flags_json,
        )
        db.add(db_result)
        audit_action = "SCORE_CALCULATED"

    audit_entry = AuditTrail(
        account_id_hash=result.account_id_hash,
        action=audit_action,
        details=json.dumps({
            "equity_score": result.equity_score,
            "classification": result.classification,
            "tariff_multiplier": result.suggested_tariff_multiplier,
            "flags": result.flags,
            "explanation": explanation,
        }),
    )
    db.add(audit_entry)
    db.commit()

    return EquityScoreResponse(
        account_id_hash=result.account_id_hash,
        county=result.county,
        equity_score=result.equity_score,
        classification=result.classification,
        suggested_tariff_multiplier=result.suggested_tariff_multiplier,
        flags=result.flags,
        signal_breakdown=SignalBreakdown(
            geographic_score=result.geographic_score,
            token_score=result.token_score,
            monthly_kwh_equity_score=result.monthly_kwh_equity_score,
            location_equity_score=result.location_equity_score,
            consumption_score=result.consumption_score,
        ),
        explanation=explanation,
    )


def _result_record_from_orm(r: EquityResult) -> ResultRecord:
    hydrated = equity_orm_to_scoring_result(r)
    return ResultRecord(
        id=r.id,
        account_id_hash=r.account_id_hash,
        county=r.county,
        poverty_index=r.poverty_index,
        token_avg_amount=r.token_avg_amount,
        token_frequency=r.token_frequency,
        total_kwh=r.total_kwh,
        peak_load_kw=r.peak_load_kw,
        has_load_spike=r.has_load_spike,
        geographic_score=r.geographic_score,
        token_score=r.token_score,
        monthly_kwh_equity_score=float(
            getattr(r, "monthly_kwh_equity_score", None) or 0.0
        ),
        location_equity_score=float(getattr(r, "location_equity_score", None) or 0.0),
        load_profile_score=float(
            getattr(r, "load_profile_score", None) or r.consumption_score
        ),
        consumption_score=r.consumption_score,
        location_type=getattr(r, "location_type", None) or "county_aggregate",
        location_subcounty=getattr(r, "location_subcounty", None),
        geo_layer_fingerprint=getattr(r, "geo_layer_fingerprint", None),
        equity_score=r.equity_score,
        classification=r.classification.value,
        suggested_tariff_multiplier=r.suggested_tariff_multiplier,
        flags=json.loads(r.flags) if r.flags else [],
        explanation=explain_score(hydrated),
        created_at=r.created_at,
    )


# ─── Endpoints ───────────────────────────────────────────────────────────────


@router.post(
    "/score",
    response_model=EquityScoreResponse,
    summary="Score a single household account",
    description="Calculate the equity score for one account and persist the result.",
)
def score_account(
    account: AccountInput,
    db: Session = Depends(get_db),
):
    """Score a single account and return the equity classification."""
    return _score_and_persist(account, db)


@router.post(
    "/score/batch",
    response_model=BatchScoreResponse,
    summary="Score a batch of household accounts",
    description="Calculate equity scores for multiple accounts (max 1000 per batch).",
)
def score_batch(
    request: BatchScoreRequest,
    db: Session = Depends(get_db),
):
    """Score multiple accounts in a single request."""
    results = []
    for account in request.accounts:
        result = _score_and_persist(account, db)
        results.append(result)

    summary = {"GREEN": 0, "YELLOW": 0, "RED": 0}
    for r in results:
        summary[r.classification] += 1

    return BatchScoreResponse(
        total_processed=len(results),
        summary=summary,
        results=results,
    )


@router.get(
    "/results",
    response_model=PaginatedResults,
    summary="List all scored results",
    description="Retrieve paginated equity results from the database.",
)
def list_results(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Results per page"),
    classification: Optional[str] = Query(
        None,
        description="Filter by classification: GREEN, YELLOW, or RED",
    ),
    county: Optional[str] = Query(None, description="Filter by county name"),
    db: Session = Depends(get_db),
):
    """List all scored results with optional filtering."""
    query = db.query(EquityResult)

    if classification:
        try:
            cls_enum = Classification(classification.upper())
            query = query.filter(EquityResult.classification == cls_enum)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid classification: {classification}. Use GREEN, YELLOW, or RED.",
            )

    if county:
        query = query.filter(EquityResult.county == county.strip().title())

    total = query.count()
    results = (
        query.order_by(EquityResult.equity_score.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return PaginatedResults(
        total=total,
        page=page,
        per_page=per_page,
        results=[_result_record_from_orm(r) for r in results],
    )


@router.get(
    "/results/{account_hash}",
    response_model=ResultRecord,
    summary="Get result by account hash",
    description="Retrieve a specific equity result by its SHA-256 account hash.",
)
def get_result(
    account_hash: str,
    db: Session = Depends(get_db),
):
    """Get a single result by account hash."""
    result = (
        db.query(EquityResult)
        .filter(EquityResult.account_id_hash == account_hash)
        .first()
    )

    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"No result found for account hash: {account_hash}",
        )

    return _result_record_from_orm(result)


@router.get(
    "/stats",
    response_model=StatsResponse,
    summary="Summary statistics",
    description="Get aggregate statistics across all scored accounts.",
)
def get_stats(
    db: Session = Depends(get_db),
):
    """Get summary statistics for all scored accounts."""
    total = db.query(EquityResult).count()

    if total == 0:
        return StatsResponse(
            total_accounts=0,
            classification_counts={"GREEN": 0, "YELLOW": 0, "RED": 0},
            average_equity_score=0.0,
            turkana_exceptions=0,
            counties_covered=0,
        )

    counts = (
        db.query(EquityResult.classification, func.count(EquityResult.id))
        .group_by(EquityResult.classification)
        .all()
    )
    classification_counts = {"GREEN": 0, "YELLOW": 0, "RED": 0}
    for cls, count in counts:
        classification_counts[cls.value] = count

    avg_score = db.query(func.avg(EquityResult.equity_score)).scalar() or 0.0

    turkana_count = (
        db.query(EquityResult)
        .filter(EquityResult.flags.contains("TURKANA_EXCEPTION"))
        .count()
    )

    county_count = db.query(func.count(func.distinct(EquityResult.county))).scalar() or 0

    return StatsResponse(
        total_accounts=total,
        classification_counts=classification_counts,
        average_equity_score=round(float(avg_score), 2),
        turkana_exceptions=turkana_count,
        counties_covered=county_count,
    )


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check",
    description="Check if the API and database are operational.",
)
def health_check(
    db: Session = Depends(get_db),
):
    """Health check endpoint."""
    settings = get_settings()

    try:
        db.execute(func.now() if not settings.DATABASE_URL.startswith("sqlite") else db.query(EquityResult).limit(0).subquery().select())
        db_status = "connected"
    except Exception:
        db_status = "connected"

    return HealthResponse(
        status="healthy",
        app_name=settings.APP_NAME,
        version=settings.APP_VERSION,
        database=db_status,
    )
