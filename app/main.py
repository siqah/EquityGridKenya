"""
EquityGrid Kenya — FastAPI Application Entry Point

Main application with CORS middleware, lifespan management,
and API documentation configuration.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
import os

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
        "EquityGrid Kenya scores household accounts with a transparent six-variable "
        "model (consumption per capita proxy, payment consistency, NSPS registration, "
        "peak demand ratio, upgrade history, and active meters at the same address). "
        "Urban / rural classification may be supplied for display context but is **not** "
        "a scored input.\n\n"
        "### Equity score and classification\n"
        "The final score is 0–100 where **higher values indicate stronger affluence / "
        "cross-subsidy risk** and lower values indicate greater vulnerability.\n\n"
        "- 🟢 **GREEN** (final score ≤ 40): Lifeline band — suggested tariff **0.60×**\n"
        "- 🟡 **YELLOW** (final score ≤ 70): Standard retail — suggested tariff **1.00×**\n"
        "- 🔴 **RED** (final score > 70): Cross-subsidy contributor — suggested tariff **1.40×**\n\n"
        "### Variable weights\n"
        "1. Consumption per capita proxy — **25%**\n"
        "2. Payment consistency (disconnection days) — **22%**\n"
        "3. NSPS registration status — **18%**\n"
        "4. Peak demand ratio — **15%**\n"
        "5. Upgrade history (three-phase / kVA) — **12%**\n"
        "6. Active accounts at address — **8%**\n"
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

# Mount the frontend built React app
frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.exception_handler(StarletteHTTPException)
    async def catch_all(request, exc):
        # Allow API 404s to pass through
        if request.url.path.startswith("/api/"):
            raise exc
        if exc.status_code == 404:
            return FileResponse(os.path.join(frontend_dist, "index.html"))
        raise exc

    @app.get("/{catchall:path}", include_in_schema=False)
    def serve_react_app(catchall: str):
        if catchall.startswith("api/"):
            raise StarletteHTTPException(status_code=404, detail="API route not found")
        # Read index.html for any other route
        return FileResponse(os.path.join(frontend_dist, "index.html"))

else:
    @app.get("/", tags=["root"])
    def root():
        """Root endpoint — API information."""
        return {
            "name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "description": "Energy Equity Intelligence Engine for Kenya",
            "docs": "/docs",
            "health": "/api/v1/health",
            "frontend": "Not built yet. Run `npm run build` in /frontend."
        }
