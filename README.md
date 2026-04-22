# EquityGridKenya

Energy equity intelligence for smart grid policy. EquityGrid Kenya is an MVP decision-support engine that identifies energy poverty patterns and flags luxury consumption anomalies using geographic, token purchase, and consumption data. Built for Kenya’s energy sector regulators and utility providers.

## Prerequisites

- **Python 3.12+** (3.13 or **3.14** are fine with the pinned dependencies in `requirements.txt`).
- **Node.js 18+** (only if you run or build the React dashboard).

Older `pydantic==2.9` pins could not install on **CPython 3.14** on Windows because `pydantic-core` had to compile against PyO3 (max 3.13). This repo pins **Pydantic 2.13+** so `pydantic-core` installs from a **prebuilt wheel** on 3.14.

## Backend (FastAPI)

From the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- **Swagger UI:** http://127.0.0.1:8000/docs  
- **ReDoc:** http://127.0.0.1:8000/redoc  
- **Health:** http://127.0.0.1:8000/api/v1/health  

On first start, the app creates the SQLite database file **`equitygrid.db`** in the current working directory (override with `DATABASE_URL` in a `.env` file; see `app/config.py`).

### Optional: load synthetic demo data

With the venv active and from the repo root:

```powershell
python scripts\generate_synthetic_data.py
```

## Frontend (React + Vite)

### Development (API on port 8000)

Terminal 1: run the backend as above.  
Terminal 2:

```powershell
cd frontend
npm install
npm run dev
```

Configure the Vite dev server proxy if your API base URL differs (see `frontend/src/api/equityApi.js`).

### Production-style: UI served by FastAPI

Build the dashboard, then run only the backend; FastAPI serves `frontend/dist` when that folder exists:

```powershell
cd frontend
npm install
npm run build
cd ..
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Open http://127.0.0.1:8000/ for the SPA (non-API routes fall back to `index.html`).

## Environment

Optional `.env` in the repo root (loaded by `pydantic-settings`), for example:

```env
DATABASE_URL=sqlite:///./equitygrid.db
```

For production, set a strong `GEOSPATIAL_LAYER_PEPPER` and tighten CORS in `app/main.py`.
