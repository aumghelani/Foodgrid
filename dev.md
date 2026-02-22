# FoodGrid Boston — Developer Setup

## Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- MongoDB Atlas account (or local mongod)

## Quick start (both servers together)

```bash
# 1. Install frontend dependencies
npm install

# 2. Install backend dependencies
cd backend
pip install -r requirements.txt

# 3. Create backend/.env (copy and fill in your values)
cp backend/.env.example backend/.env   # edit MONGODB_URI, MONGODB_DB_NAME

# 4. Run frontend + backend together
npm run dev:full
```

This starts:
- **Django** on `http://127.0.0.1:8000`
- **Vite** on `http://127.0.0.1:5173` (proxies `/api/*` → Django)

Open `http://localhost:5173` in your browser.

---

## Running servers separately

```bash
# Frontend only
npm run dev

# Backend only
cd backend
python manage.py runserver 127.0.0.1:8000
# or use the helper script:
bash backend/start.sh        # macOS / Linux
backend\start.bat            # Windows
```

---

## Seed the database

```bash
cd backend

# Option 1 — fast mock seed (10 tracts + 6 resources, no geocoding)
python scripts/seed_mock_data.py

# Option 2 — real PolicyMap data (requires CSV files in backend/PolicyMap Data/)
python manage.py ingest_tracts
python manage.py ingest_resources --geocode   # geocodes 578+ stores (slow)
python manage.py ingest_acs                   # ACS demographic overlays
```

### Check connectivity

```bash
cd backend
python manage.py check_connection
```

This pings MongoDB and prints document counts. If it fails, check `MONGODB_URI` in `backend/.env`.

---

## Environment variables (`backend/.env`)

| Variable | Example | Description |
|---|---|---|
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/` | Atlas connection string |
| `MONGODB_DB_NAME` | `foodgrid` | Database name |
| `DJANGO_SECRET_KEY` | `change-me-in-prod` | Django secret key |
| `DJANGO_DEBUG` | `True` | Enable debug mode |
| `DJANGO_ALLOWED_HOSTS` | `localhost,127.0.0.1` | Comma-separated allowed hosts |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Comma-separated CORS origins |

---

## API endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/tracts/` | All census tracts (GeoJSON FeatureCollection) |
| GET | `/api/v1/tracts/<tract_id>/` | Single tract + resources |
| GET | `/api/v1/tracts/stats/` | City-wide aggregate stats |
| GET | `/api/v1/resources/` | Food resources (filterable) |
| GET | `/api/v1/resources/<resource_id>/` | Single resource |
| POST | `/api/v1/simulation/run/` | Run policy simulation |

### Resource filter params

```
GET /api/v1/resources/?type=pantry&type=mobile&snap=true&lat=42.36&lng=-71.06&max_minutes=30
```

---

## Troubleshooting

**ECONNREFUSED / backend offline banner**
- Make sure Django is running: `python manage.py runserver 127.0.0.1:8000`
- The Vite proxy uses `127.0.0.1` (not `localhost`) to avoid IPv6 issues

**Empty map / no tracts**
- Run `python scripts/seed_mock_data.py` or `python manage.py ingest_tracts`
- Backend views return hardcoded fallback data when collections are empty

**Slider not filtering**
- The travel-time slider only fires an API request on mouse/touch release (not every tick)

**TypeScript errors after pull**
- Run `npx tsc --noEmit` to check; most type errors come from mismatched API shapes
