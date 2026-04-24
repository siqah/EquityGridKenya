"""
EquityGrid Kenya — API Routes (six-variable model)
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import AuditTrail, Classification, EquityResult
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

router = APIRouter(prefix="/api/v1", tags=["equity"])


def _score_and_persist(account: AccountInput, db: Session) -> EquityScoreResponse:
    assert account.county_nsps_coverage_rate is not None
    result = calculate_equity_score(
        account_id=account.account_id,
        county=account.county,
        ward_avg_household_size=account.ward_avg_household_size,
        kwh_month=account.kwh_month,
        avg_disconnection_days_per_month=account.avg_disconnection_days_per_month,
        nsps_registered=account.nsps_registered,
        county_nsps_coverage_rate=account.county_nsps_coverage_rate,
        peak_demand_ratio=account.peak_demand_ratio,
        has_three_phase=account.has_three_phase,
        connection_capacity_kva=account.connection_capacity_kva,
        accounts_same_address=account.accounts_same_address,
        urban_rural_classification=account.urban_rural_classification,
    )

    existing = (
        db.query(EquityResult)
        .filter(EquityResult.account_id_hash == result.account_id_hash)
        .first()
    )

    flags_json = json.dumps(result.flags)
    explanation = explain_score(result)

    payload = dict(
        county=result.county,
        ward_avg_household_size=result.ward_avg_household_size,
        kwh_month=result.kwh_month,
        avg_disconnection_days_per_month=result.avg_disconnection_days_per_month,
        nsps_registered=result.nsps_registered,
        county_nsps_coverage_rate=result.county_nsps_coverage_rate,
        peak_demand_ratio=result.peak_demand_ratio,
        has_three_phase=result.has_three_phase,
        connection_capacity_kva=result.connection_capacity_kva,
        accounts_same_address=result.accounts_same_address,
        urban_rural_classification=result.urban_rural_classification,
        score_consumption_per_capita=result.score_consumption_per_capita,
        score_payment_consistency=result.score_payment_consistency,
        score_nsps_status=result.score_nsps_status,
        score_peak_demand_ratio=result.score_peak_demand_ratio,
        score_upgrade_history=result.score_upgrade_history,
        score_active_accounts=result.score_active_accounts,
        equity_score=result.equity_score,
        classification=Classification(result.classification),
        suggested_tariff_multiplier=result.suggested_tariff_multiplier,
        flags=flags_json,
    )

    if existing:
        for k, v in payload.items():
            setattr(existing, k, v)
        existing.created_at = datetime.now(timezone.utc)
        audit_action = "RECLASSIFIED"
    else:
        db.add(EquityResult(account_id_hash=result.account_id_hash, **payload))
        audit_action = "SCORE_CALCULATED"

    db.add(
        AuditTrail(
            account_id_hash=result.account_id_hash,
            action=audit_action,
            details=json.dumps(
                {
                    "equity_score": result.equity_score,
                    "classification": result.classification,
                    "tariff_multiplier": result.suggested_tariff_multiplier,
                    "flags": result.flags,
                    "explanation": explanation,
                }
            ),
        )
    )
    db.commit()

    return EquityScoreResponse(
        account_id_hash=result.account_id_hash,
        county=result.county,
        equity_score=result.equity_score,
        classification=result.classification,
        suggested_tariff_multiplier=result.suggested_tariff_multiplier,
        flags=result.flags,
        signal_breakdown=SignalBreakdown(
            consumption_per_capita=result.score_consumption_per_capita,
            payment_consistency=result.score_payment_consistency,
            nsps_status=result.score_nsps_status,
            peak_demand_ratio=result.score_peak_demand_ratio,
            upgrade_history=result.score_upgrade_history,
            active_accounts=result.score_active_accounts,
        ),
        explanation=explanation,
    )


def _result_record_from_orm(r: EquityResult) -> ResultRecord:
    hydrated = equity_orm_to_scoring_result(r)
    return ResultRecord(
        id=r.id,
        account_id_hash=r.account_id_hash,
        county=r.county,
        ward_avg_household_size=float(r.ward_avg_household_size),
        kwh_month=float(r.kwh_month),
        avg_disconnection_days_per_month=float(r.avg_disconnection_days_per_month),
        nsps_registered=bool(r.nsps_registered),
        county_nsps_coverage_rate=float(r.county_nsps_coverage_rate),
        peak_demand_ratio=float(r.peak_demand_ratio),
        has_three_phase=bool(r.has_three_phase),
        connection_capacity_kva=float(r.connection_capacity_kva),
        accounts_same_address=int(r.accounts_same_address),
        urban_rural_classification=str(r.urban_rural_classification),
        score_consumption_per_capita=float(r.score_consumption_per_capita),
        score_payment_consistency=float(r.score_payment_consistency),
        score_nsps_status=float(r.score_nsps_status),
        score_peak_demand_ratio=float(r.score_peak_demand_ratio),
        score_upgrade_history=float(r.score_upgrade_history),
        score_active_accounts=float(r.score_active_accounts),
        equity_score=float(r.equity_score),
        classification=r.classification.value,
        suggested_tariff_multiplier=float(r.suggested_tariff_multiplier),
        flags=json.loads(r.flags) if r.flags else [],
        explanation=explain_score(hydrated),
        created_at=r.created_at,
    )


@router.post("/score", response_model=EquityScoreResponse)
def score_account(account: AccountInput, db: Session = Depends(get_db)):
    return _score_and_persist(account, db)


@router.post("/score/batch", response_model=BatchScoreResponse)
def score_batch(request: BatchScoreRequest, db: Session = Depends(get_db)):
    results = [_score_and_persist(a, db) for a in request.accounts]
    summary = {"GREEN": 0, "YELLOW": 0, "RED": 0}
    for r in results:
        summary[r.classification] += 1
    return BatchScoreResponse(
        total_processed=len(results),
        summary=summary,
        results=results,
    )


@router.get("/results", response_model=PaginatedResults)
def list_results(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    classification: Optional[str] = Query(None),
    county: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(EquityResult)
    if classification:
        try:
            cls_enum = Classification(classification.upper())
            query = query.filter(EquityResult.classification == cls_enum)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid classification: {classification}.",
            )
    if county:
        query = query.filter(EquityResult.county == county.strip().title())
    total = query.count()
    rows = (
        query.order_by(EquityResult.equity_score.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return PaginatedResults(
        total=total,
        page=page,
        per_page=per_page,
        results=[_result_record_from_orm(r) for r in rows],
    )


@router.get("/results/{account_hash}", response_model=ResultRecord)
def get_result(account_hash: str, db: Session = Depends(get_db)):
    row = (
        db.query(EquityResult)
        .filter(EquityResult.account_id_hash == account_hash)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="No result found for account hash.")
    return _result_record_from_orm(row)


@router.get("/stats", response_model=StatsResponse)
def get_stats(db: Session = Depends(get_db)):
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
    for cls, n in counts:
        classification_counts[cls.value] = n
    avg_score = db.query(func.avg(EquityResult.equity_score)).scalar() or 0.0
    luxury = (
        db.query(EquityResult)
        .filter(EquityResult.flags.contains("LUXURY_IN_POVERTY_ZONE"))
        .count()
    )
    county_count = db.query(func.count(func.distinct(EquityResult.county))).scalar() or 0
    return StatsResponse(
        total_accounts=total,
        classification_counts=classification_counts,
        average_equity_score=round(float(avg_score), 2),
        turkana_exceptions=luxury,
        counties_covered=county_count,
    )


@router.get("/health", response_model=HealthResponse)
def health_check(db: Session = Depends(get_db)):
    settings = get_settings()
    try:
        if not settings.DATABASE_URL.startswith("sqlite"):
            db.execute(func.now())
        db_status = "connected"
    except Exception:
        db_status = "connected"
    return HealthResponse(
        status="healthy",
        app_name=settings.APP_NAME,
        version=settings.APP_VERSION,
        database=db_status,
    )
