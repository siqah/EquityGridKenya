"""
EquityGrid Kenya — FastAPI Application Entry Point

Main application with CORS middleware, lifespan management,
and API documentation configuration.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import init_db
from app.routers.equity import router as equity_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — initializes database on startup."""
    settings = get_settings()
    print(f"\n🔌 {settings.APP_NAME} v{settings.APP_VERSION}")
    print(f"📊 Database: {settings.DATABASE_URL}")
    print(f"⚡ Initializing database tables...")
    init_db()
    print(f"✅ Ready!\n")
    yield
    print(f"\n🔴 {settings.APP_NAME} shutting down.\n")


settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "**Energy Equity Intelligence for Smart Grid Policy**\n\n"
        "EquityGrid Kenya is an MVP decision-support engine that identifies "
        "energy poverty patterns and flags luxury consumption anomalies using "
        "geographic, token purchase, and consumption data.\n\n"
        "Built for Kenya's energy sector regulators and utility providers.\n\n"
        "### Classification System\n"
        "- 🟢 **GREEN** (Score 70-100): Subsidize — genuine energy poverty\n"
        "- 🟡 **YELLOW** (Score 40-69): Standard — no adjustment\n"
        "- 🔴 **RED** (Score 0-39): Luxury/Anomaly — cross-subsidy contributor\n\n"
        "### Signals\n"
        "1. **Geographic Zone** — County poverty index (KNBS data)\n"
        "2. **Consumption Data** — kWh usage + load spike detection\n"
        "3. **Token Patterns** — Purchase frequency & average amount\n"
    ),
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(equity_router)


@app.get("/", tags=["root"])
def root():
    """Root endpoint — API information."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "description": "Energy Equity Intelligence Engine for Kenya",
        "docs": "/docs",
        "health": "/api/v1/health",
    }
