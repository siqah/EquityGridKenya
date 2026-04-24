"""
EquityGrid Kenya — Database Engine & Session Management

SQLAlchemy setup. SQLite locally; PostgreSQL-ready via connection string swap.
"""

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.config import get_settings

settings = get_settings()

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


def _sqlite_ensure_equity_v6_schema() -> None:
    """
    One-time migration: older equity_results rows used the pre–six-variable schema.
    SQLite cannot drop columns cleanly; recreate the table if legacy columns exist.
    """
    if not settings.DATABASE_URL.startswith("sqlite"):
        return

    insp = inspect(engine)
    if "equity_results" not in insp.get_table_names():
        return

    cols = {c["name"] for c in insp.get_columns("equity_results")}
    if "ward_avg_household_size" in cols:
        return

    with engine.begin() as conn:
        conn.execute(text("DROP TABLE IF EXISTS equity_results"))
    Base.metadata.create_all(bind=engine)


def init_db():
    """Create all tables. Called on application startup."""
    from app import models  # noqa: F401 — register models on Base.metadata

    Base.metadata.create_all(bind=engine)
    _sqlite_ensure_equity_v6_schema()
