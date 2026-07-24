# EquityGrid Kenya — Deployment & Monolithic Architecture Guide

This guide explains how the **monolithic unified structure** of EquityGrid Kenya works under the hood and provides a step-by-step walkthrough to build, run, and deploy it using Docker.

---

## 1. How the Monolithic Architecture Works

Historically, frontend (React) and backend (FastAPI) applications are hosted as separate services (e.g., frontend on Vercel, backend on Render). 

EquityGrid Kenya implements a **unified monolith** model where the FastAPI backend serves both the React user interface and the API endpoints on the same port.

```
                    ┌──────────────────────────────┐
                    │       User's Browser         │
                    └──────────────┬───────────────┘
                                   │
                                   │ (Port 8000)
                                   ▼
                    ┌──────────────────────────────┐
                    │      FastAPI Router          │
                    └──────┬────────────────┬──────┘
                           │                │
             (If path starts with /api/)    (If any other path / static asset)
                           ▼                ▼
                    ┌─────────────┐  ┌─────────────┐
                    │  REST APIs  │  │  React SPA  │
                    │  (Routers)  │  │ (assets/dist)│
                    └─────────────┘  └─────────────┘
```

### The Static Mounting Mechanism

In [app/main.py](file:///Users/app/Desktop/EquityGridKenya/app/main.py), we check if the built frontend directory exists:

1. **Asset Mounting:** All javascript and stylesheet assets are compiled by Vite into `frontend/dist/assets`. FastAPI mounts this directory at the `/assets` path:
   ```python
   app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")
   ```
2. **SPA Routing Fallback:** For single-page apps (SPAs) like React, the browser handles page routing (like `/lookup` or `/vitals`). If a user reloads `/vitals` directly in their browser, the server normally returns a `404 Not Found`. To resolve this, FastAPI routes all non-API paths to serve `index.html`:
   ```python
   @app.get("/{catchall:path}", include_in_schema=False)
   def serve_react_app(catchall: str):
       if catchall.startswith("api/"):
           raise StarletteHTTPException(status_code=404, detail="API route not found")
       return FileResponse(os.path.join(frontend_dist, "index.html"))
   ```
3. **No Proxy Needed in Production:** In development, Vite runs on port `5173` and proxies calls to the backend on port `8000`. In production, since both are hosted on the same origin (e.g., `http://localhost:8000`), the frontend calls relative routes like `/api/v1/score` directly, eliminating the need for proxy setups.

---

## 2. Dockerfile Build Pipeline

The [Dockerfile](file:///Users/app/Desktop/EquityGridKenya/Dockerfile) uses a **Multi-Stage Build** to minimize image size:

1. **Stage 1 (Build Frontend):** Starts with Node.js, installs frontend packages, and compiles the React source into the `frontend/dist` directory.
2. **Stage 2 (Build & Package Backend):** Starts with a slim Python image, installs python dependencies from `requirements.txt`, copies backend folders, and pulls the `frontend/dist` directory built in Stage 1. It exposes port `8000` and starts the app.

---

## 3. Step-by-Step Local Deployment Run

Follow these commands to build and run the Docker image correctly.

### Step 1: Build the Image
```bash
docker build -t equitygrid-kenya .
```

### Step 2: Run the Container
To run the container locally, expose port `8000` and specify the image name `equitygrid-kenya` at the end:
```bash
docker run -p 8000:8000 \
  -e DATABASE_URL=sqlite:///./equitygrid.db \
  -e GEOSPATIAL_LAYER_PEPPER=my_secret_pepper_salt_string \
  equitygrid-kenya
```

> [!TIP]
> Ensure the image name (`equitygrid-kenya`) is the very last argument of the command.

### Step 3: Populate the Database with Demo Cohort
While the container is running in the background, execute the synthetic generator script inside the container to seed the database:
```bash
# Find the container ID
docker ps

# Seed the data (replace CONTAINER_ID with your running container hash)
docker exec -it CONTAINER_ID python scripts/generate_synthetic_data.py
```

Open `http://localhost:8000` in your web browser to test!

---

## 4. Production Cloud Deployment

### Render (Docker Runtime)
1. Push your repository to GitHub.
2. Go to **Render Dashboard** and select **New > Web Service**.
3. Select your repository and choose **Docker** as the environment.
4. Under **Advanced**, add the following environment variables:
   *   `GEOSPATIAL_LAYER_PEPPER`: (A long, secure random string)
   *   `DATABASE_URL`: `sqlite:///./equitygrid.db` (or a PostgreSQL connection string for persistent storage)
5. Click **Deploy**. Render will build and deploy the container automatically.

### Railway (Automatic Docker Detection)
1. Create a new project on **Railway**.
2. Select **Deploy from GitHub repo** and connect your repository.
3. Railway automatically detects the `Dockerfile` in your root and handles the build.
4. Add your environment variables in the variables dashboard tab.
5. In your settings, enable a public domain to access the application.

---

## 5. Preventing Render Free Tier Spin-Down (Keep-Alive Guide)

Render's Free tier automatically spins down (goes to sleep) your application after **15 minutes of inactivity**. The next request can take **30 to 50 seconds** to start up while the container cold-starts.

Here are the best methods to keep your application alive 24/7 for free:

### Method A: Use a Free External Uptime Pinger (Highly Recommended)
An external pinger sends a request to your server at regular intervals, preventing it from ever reaching 15 minutes of inactivity.

1. **UptimeRobot (Free):**
   *   Sign up for a free account at [UptimeRobot](https://uptimerobot.com/).
   *   Click **Add New Monitor**.
   *   Select **Monitor Type:** `HTTP(s)`.
   *   Set **Friendly Name:** `EquityGrid Kenya Keep-Alive`.
   *   Set **URL (or IP):** `https://your-app-name.onrender.com/api/v1/health` (use your deployed Render URL).
   *   Set **Monitoring Interval:** Every `5 minutes` or `10 minutes` (anything under 14 minutes prevents spin-down).
   *   Click **Create Monitor**.

2. **Cron-Job.org (Free):**
   *   Sign up at [Cron-Job.org](https://cron-job.org/).
   *   Create a new cron job that executes a `GET` request to `https://your-app-name.onrender.com/api/v1/health` every 10 minutes.

### Method B: Use a Self-Ping Workflow Script
If you have a GitHub Actions workflow or a secondary server running, you can create a simple curl command cron job:
```bash
# Crontab entry to ping the app every 10 minutes:
*/10 * * * * curl -s https://your-app-name.onrender.com/api/v1/health > /dev/null
```

### Method C: Upgrade to Render's Paid Individual Tier
*   Render offers paid individual plans starting at **$7/month**. 
*   Upgrading immediately disables the spin-down behavior entirely and provides persistent SSD disk storage (beneficial for keeping the SQLite database persistent without Postgres).

