"""
EquityGrid Kenya — Database Engine & Session Management

SQLAlchemy async-compatible setup. Uses SQLite locally,
PostgreSQL-ready via connection string swap.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.config import get_settings

settings = get_settings()

# SQLite requires connect_args for thread safety
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=settings.DEBUG,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass


def get_db():
    """FastAPI dependency — yields a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _sqlite_migrate_equity_results() -> None:
    """Add scoring-engine columns introduced after the initial MVP schema."""
    if not settings.DATABASE_URL.startswith("sqlite"):
        return

    from sqlalchemy import inspect, text

    insp = inspect(engine)
    if "equity_results" not in insp.get_table_names():
        return

    names = {c["name"] for c in insp.get_columns("equity_results")}
    alters: list[str] = []
    if "monthly_kwh_equity_score" not in names:
        alters.append(
            "ALTER TABLE equity_results ADD COLUMN monthly_kwh_equity_score "
            "REAL NOT NULL DEFAULT 0"
        )
    if "location_equity_score" not in names:
        alters.append(
            "ALTER TABLE equity_results ADD COLUMN location_equity_score "
            "REAL NOT NULL DEFAULT 0"
        )
    if "load_profile_score" not in names:
        alters.append(
            "ALTER TABLE equity_results ADD COLUMN load_profile_score "
            "REAL NOT NULL DEFAULT 0"
        )
    if "location_type" not in names:
        alters.append(
            "ALTER TABLE equity_results ADD COLUMN location_type "
            "VARCHAR(32) NOT NULL DEFAULT 'county_aggregate'"
        )
    if "location_subcounty" not in names:
        alters.append(
            "ALTER TABLE equity_results ADD COLUMN location_subcounty VARCHAR(120)"
        )
    if "geo_layer_fingerprint" not in names:
        alters.append(
            "ALTER TABLE equity_results ADD COLUMN geo_layer_fingerprint VARCHAR(32)"
        )
    if not alters:
        return

    with engine.begin() as conn:
        for sql in alters:
            conn.execute(text(sql))


def init_db():
    """Create all tables. Called on application startup."""
    Base.metadata.create_all(bind=engine)
    _sqlite_migrate_equity_results()
