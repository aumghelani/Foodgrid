# FoodGrid Boston — Backend

Django 4.2 + Django REST Framework API backed by MongoDB Atlas.
No Django ORM — all data access goes through `pymongo` directly.

---

## Tech Stack

| Layer | Library |
|---|---|
| Web framework | Django 4.2 + Django REST Framework 3.15 |
| Database driver | pymongo 4 (no Djongo, no MongoEngine) |
| Async driver | motor 3 (reserved for future async views) |
| Data processing | pandas 2, numpy 1, shapely 2 |
| Geocoding | geopy 2 (Nominatim / OpenStreetMap) |
| Config | python-dotenv 1 |

---

## Project Structure

```
backend/
├── config/           # Django settings, root URLs, WSGI
├── core/             # Shared utilities (db.py, exceptions.py, pagination.py)
├── tracts/           # Census-tract API (/api/v1/tracts/)
├── resources/        # Food-resource API (/api/v1/resources/)
├── simulation/       # Simulation API (/api/v1/simulation/)
├── ingestion/        # Management commands for data ingestion
│   └── management/commands/
│       ├── ingest_tracts.py    — PolicyMap CSV → MongoDB census_tracts
│       ├── ingest_resources.py — USDA food stores + farmers markets → MongoDB
│       └── ingest_acs.py       — delegates to ingest_tracts
├── scripts/
│   └── seed_mock_data.py  — fast dev seed (10 tracts, 15 resources)
├── PolicyMap Data/        — raw CSV exports from PolicyMap
├── requirements.txt
└── .env.example
```

---

## Quick Start

### 1. Prerequisites

- Python 3.11+
- A MongoDB Atlas cluster (free tier is fine) **or** a local `mongod` instance

### 2. Install

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure

```bash
cp .env.example .env
# Edit .env — set MONGODB_URI, MONGODB_DB_NAME, and SECRET_KEY
```

### 4. Verify

```bash
python manage.py check           # Should print "System check identified no issues"
curl http://localhost:8000/api/health/
# {"status": "ok", "db": "connected"}
```

### 5. Seed development data

Fastest path — loads 10 tracts + 15 resources from the seed script:

```bash
python scripts/seed_mock_data.py
```

Or run the full PolicyMap ingestion pipeline:

```bash
# Ingest census-tract data (derives food-risk scores from PolicyMap CSVs)
python manage.py ingest_tracts

# Ingest food stores + farmers markets (add --geocode to resolve lat/lng)
python manage.py ingest_resources --geocode
```

### 6. Run

```bash
python manage.py runserver 8000
```

---

## API Endpoints

### Health

```
GET /api/health/
→ { "status": "ok", "db": "connected" | "error" }
```

### Census Tracts

```
GET /api/v1/tracts/
→ GeoJSON FeatureCollection of all tracts

GET /api/v1/tracts/stats/
→ { equity_score, transit_coverage, high_risk_tracts, total_tracts }

GET /api/v1/tracts/<tract_id>/
→ { tract, resources: [...], ai_explanation: "..." }
```

### Food Resources

```
GET /api/v1/resources/
  ?type=pantry|grocery|market|mobile  (repeatable)
  ?snap=true|false
  ?free=true|false
  ?open_now=true|false
  ?lat=42.36&lng=-71.06&max_minutes=30
  ?tract_id=25025010100
→ { count: int, results: [...] }

GET /api/v1/resources/<resource_id>/
→ single FoodResource document
```

### Simulation

```
POST /api/v1/simulation/run/
Body: { "tract_id": "25025010100", "interventions": ["add_pantry", "add_mobile"] }
→ {
    tract_id, tract_name, interventions,
    before: { food_risk_score, equity_score, transit_coverage, ... },
    after:  { food_risk_score, equity_score, transit_coverage, ... },
    delta:  { food_risk_score, equity_score, transit_coverage },
    households_reached: int
  }
```

**Valid interventions:**

| Name | Effect |
|---|---|
| `add_pantry` | −0.08 × (1 − supply) to food_risk_score; +0.04 equity |
| `add_mobile` | −0.05 × (1 − transit) to food_risk_score; +0.06 transit |
| `extend_hours` | −0.03 food_risk_score; +0.02 equity |

---

## Data Sources

| Dataset | Source | File |
|---|---|---|
| Median Household Income | ACS 5-yr (Census) via PolicyMap | `PolicyMap Data Median Household Income (raw $).csv` |
| Low Income + Low Access flag | USDA LILA | `PolicyMap Data Low Income + Low Access flag (USDA LILA).csv` |
| Average Food Spending | PolicyMap / BLS | `PolicyMap Data Amount Spent per Household on Food.csv` |
| Population Density | ACS 5-yr (Census) via PolicyMap | `PolicyMap Data Population Density.csv` |
| Income % of AMI | ACS / HUD via PolicyMap | `PolicyMap Data Median Household Income %.csv` |
| Food Store Locations | USDA | `PolicyMap Data Food Store Locations (578 stores).csv` |
| Farmers Markets | USDA | `PolicyMap Data Farmers Markets locations .csv` |

---

## Food Risk Score Formula

```
FoodRiskScore = 0.4 × need_score
              + 0.3 × (1 − supply_score)
              + 0.2 × (1 − transit_score)
              + 0.1 × vulnerability_index
```

- **need_score** — derived from median income (lower → more need) + average food spending
- **supply_score** — driven by the USDA LILA food-desert flag
- **transit_score** — population density proxy for MBTA accessibility
- **vulnerability_index** — income relative to Area Median Income (AMI)

All inputs and outputs are normalised to [0, 1]. Higher score = worse access.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SECRET_KEY` | Yes | Django secret key |
| `MONGODB_URI` | Yes | MongoDB Atlas URI (`mongodb+srv://…`) or local `mongodb://localhost:27017` |
| `MONGODB_DB_NAME` | Yes | Database name (e.g. `foodgrid`) |
| `DJANGO_ALLOWED_HOSTS` | No | Comma-separated hosts (default: `localhost,127.0.0.1`) |
| `CORS_ALLOWED_ORIGINS` | No | Comma-separated origins (default: `http://localhost:5173`) |
| `DEBUG` | No | `true` in development, `false` in production |

---

## MongoDB Collections

### `census_tracts`

```json
{
  "tract_id":             "25025010100",
  "tract_name":           "Roxbury",
  "food_risk_score":      0.88,
  "equity_score":         0.31,
  "transit_coverage":     0.62,
  "food_insecurity_rate": 0.29,
  "poverty_rate":         0.34,
  "snap_rate":            0.41,
  "population":           28400
}
```

### `food_resources`

```json
{
  "resource_id":  "dudley-farmers-market-310624",
  "name":         "Dudley Farmers Market",
  "type":         "market",
  "address":      "427 Dudley St, Boston, MA 02119",
  "coordinates":  [-71.0832, 42.3277],
  "snap":         true,
  "free":         false,
  "tract_id":     "25025010100"
}
```

### `city_stats`

```json
{
  "_type":            "city_stats",
  "equity_score":     0.52,
  "transit_coverage": 0.70,
  "high_risk_tracts": 4,
  "total_tracts":     10
}
```
