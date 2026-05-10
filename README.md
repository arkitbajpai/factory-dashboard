# FactoryIQ — AI-Powered Production Dashboard

**Stack:** Node.js + Express · MongoDB Atlas · React · Docker

---

#

## Step  — Run with Docker

```bash
docker-compose up --build
```

- **Dashboard:** http://localhost:3000
- **API health:** http://localhost:8000/api/health

The app auto-seeds MongoDB with ~500 events on first boot.

---

## Run Without Docker

**Backend:**
```bash
cd backend
npm install
node server.js        # production
npm run dev           # dev with auto-reload
```

**Frontend** (separate terminal):
```bash
cd frontend
npm install --legacy-peer-deps
REACT_APP_API_URL=http://localhost:8000/api npm start
```

Windows frontend:
```cmd
set REACT_APP_API_URL=http://localhost:8000/api && npm start
```

---

## Evaluator Commands

```bash
# Refresh all event data (clears + regenerates)
curl -X POST http://localhost:8000/api/seed/refresh

# Check current MongoDB document counts
curl http://localhost:8000/api/seed/status

# Health check
curl http://localhost:8000/api/health
```

---

## Architecture

```
AI CCTV Camera
      │ JSON events
      ▼
Node.js + Express (port 8000)
  ├── POST /api/events/ingest         single event
  ├── POST /api/events/ingest/batch   bulk ingest
  ├── GET  /api/metrics/factory       factory KPIs
  ├── GET  /api/metrics/workers       per-worker metrics
  ├── GET  /api/metrics/workstations  per-station metrics
  ├── GET  /api/metrics/timeline      event timeline
  ├── POST /api/seed/refresh          reset seed data
  └── GET  /api/seed/status           document counts
      │
      ▼
MongoDB Atlas (cloud)
  Collections:
  ├── workers       (6 documents)
  ├── workstations  (6 documents)
  └── events        (~500+ documents, indexed)
      │
      ▼
React Frontend (port 3000)
  via Nginx reverse proxy → /api/* → backend:8000
```

---

## MongoDB Collections & Schema

### workers
```json
{ "worker_id": "W1", "name": "Arjun Sharma", "role": "Senior Operator", "shift": "Morning" }
```

### workstations
```json
{ "station_id": "S1", "name": "Assembly Line A", "type": "Assembly", "location": "Floor A" }
```

### events
```json
{
  "event_id": "EVT-ABC123",
  "timestamp": "2026-01-15T10:15:00.000Z",
  "worker_id": "W1",
  "workstation_id": "S1",
  "event_type": "working",
  "confidence": 0.93,
  "count": 0,
  "ingested_at": "2026-01-15T10:15:05.000Z",
  "model_version": "cv-model-v1.0"
}
```

**Indexes:** `timestamp`, `worker_id`, `workstation_id`, `event_type`, `event_id` (unique), compound `(worker_id, timestamp)`, `(workstation_id, timestamp)`

---

## Metric Definitions

| Metric | Formula |
|---|---|
| Utilization % | working_time / (working + idle) × 100 |
| Units / Hour | units_produced / working_hours |
| Throughput Rate | units / occupancy_hours at station |
| Duration inference | Gap to next event, capped at 30 min |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/events/ingest` | Single event ingest |
| POST | `/api/events/ingest/batch` | Batch ingest |
| GET | `/api/events/` | List events (filterable) |
| GET | `/api/metrics/factory` | Factory KPIs |
| GET | `/api/metrics/workers` | Worker metrics |
| GET | `/api/metrics/workstations` | Station metrics |
| GET | `/api/metrics/timeline` | Event timeline |
| POST | `/api/seed/refresh` | Reset seed data |
| GET | `/api/seed/status` | Document counts |
| GET | `/api/health` | Health check |
