# Sentinel — Civic Complaint Intelligence Platform

## Full Architecture Reference (for AI Agents)

---

## Overview

**Sentinel** is an AI-powered civic complaint management system with three components:

1. **FastAPI Backend** (Python) — REST API + Groq LLM + SQLite + geospatial dedup
2. **Citizen Frontend** (React/Vite) — complaint submission (text/voice) + status tracking
3. **Admin Frontend** (React/Vite/Leaflet) — dashboard with map, ticket list, status management

---

## Project Root

```
c:\Users\Gaurav Giri\OneDrive\Desktop\IEEE\sentinel\
```

---

## Folder Structure

```
sentinel/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                    # FastAPI entrypoint, CORS, lifespan
│   │   ├── config.py                  # pydantic-settings, loads .env
│   │   ├── database.py                # async SQLAlchemy engine, session, Base
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── ticket.py              # Ticket ORM model (SQLAlchemy)
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── complaint.py           # ComplaintInput, ComplaintAnalysis, LocationInfo
│   │   │   └── ticket.py              # TicketResponse, TicketCreate, TicketStatusUpdate, TicketListResponse
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── llm_service.py         # Groq chat API → ComplaintAnalysis JSON
│   │   │   ├── stt_service.py         # Groq Whisper voice-to-text
│   │   │   ├── dedup_service.py       # geohash + haversine dedup (200m, same category)
│   │   │   └── priority_service.py    # severity × log(report_count+1)
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── complaints.py          # POST /complaints/analyze, POST /complaints, POST /complaints/voice
│   │   │   └── tickets.py             # GET /tickets, GET /tickets/{id}, PATCH /tickets/{id}/status
│   │   └── utils/
│   │       ├── __init__.py
│   │       └── geo.py                 # haversine(lat1,lon1,lat2,lon2) → metres
│   ├── requirements.txt               # pinned deps
│   ├── .env                           # GROQ_API_KEY, DATABASE_URL
│   ├── .env.example
│   └── sentinel.db                    # SQLite file (auto-created on startup)
│
├── frontend-citizen/                   # Vite + React, port 5173
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx                    # Root: header nav (Report Issue | Track Status)
│   │   ├── App.css                    # Full dark glassmorphism CSS
│   │   ├── index.css
│   │   ├── api/
│   │   │   └── client.js              # analyzeComplaint, submitComplaint, submitVoiceComplaint, getTicket
│   │   ├── components/
│   │   │   ├── ComplaintForm.jsx       # 3-step: input → AI preview → success
│   │   │   ├── VoiceRecorder.jsx       # MediaRecorder API, returns audio Blob
│   │   │   └── StatusTracker.jsx       # ticket ID → status timeline
│   │   └── pages/
│   │       ├── SubmitComplaint.jsx
│   │       └── TrackTicket.jsx
│   ├── package.json
│   └── vite.config.js
│
├── frontend-admin/                     # Vite + React + Leaflet, port 5174
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx                    # Root: header with "Live" indicator
│   │   ├── App.css                    # Full dark premium dashboard CSS
│   │   ├── index.css
│   │   ├── api/
│   │   │   └── client.js              # getTickets, getTicket, updateTicketStatus
│   │   ├── components/
│   │   │   ├── TicketMap.jsx           # Leaflet map, severity-colored CircleMarkers
│   │   │   ├── TicketList.jsx          # Sortable rows with severity bar
│   │   │   └── TicketDetail.jsx        # Detail panel + status update buttons
│   │   └── pages/
│   │       └── Dashboard.jsx           # Stats bar + filter/view tabs + 3-pane layout
│   ├── package.json
│   └── vite.config.js
│
└── instruction.md                      # Original spec
```

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Backend Runtime | Python | 3.13 |
| Backend Framework | FastAPI | 0.115.12 |
| ASGI Server | Uvicorn | 0.34.0 |
| ORM | SQLAlchemy (async) | ≥2.0.36 |
| Database | SQLite via aiosqlite | 0.20.0 |
| LLM | Groq API (llama-3.3-70b-versatile) | groq 0.9.0 |
| STT | Groq Whisper (whisper-large-v3) | via groq SDK |
| Geohash | pygeohash (pure Python) | 1.2.0 |
| Settings | pydantic-settings | 2.7.0 |
| Frontend Framework | React | 19.x (via Vite 8.2) |
| Map | Leaflet + react-leaflet | latest |
| Styling | Vanilla CSS (dark glassmorphism) | — |

---

## API Endpoints

### Base URL: `http://localhost:8000`
### Swagger Docs: `http://localhost:8000/docs`

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/` | Health check, returns `{status, service, version}` | None |
| `GET` | `/health` | Returns `{status: "healthy"}` | None |
| `POST` | `/complaints/analyze` | LLM analysis only (no DB save). Body: `ComplaintInput` | None |
| `POST` | `/complaints` | Full flow: analyze → dedup → save. Body: `ComplaintInput` | None |
| `POST` | `/complaints/voice` | Voice flow: transcribe → analyze → save. Multipart: `audio` file + optional `lat`, `lng` | None |
| `GET` | `/tickets` | List all tickets. Query params: `?status=`, `?department=`, `?category=` | None |
| `GET` | `/tickets/{id}` | Get single ticket by ID | None |
| `PATCH` | `/tickets/{id}/status` | Update status. Body: `{"status": "new|in_progress|resolved"}` | None |

---

## Data Models

### Ticket (SQLAlchemy ORM → `tickets` table)

| Column | Type | Notes |
|---|---|---|
| `id` | Integer (PK) | Auto-increment |
| `category` | String(64) | Indexed. e.g. "Pothole", "Garbage" |
| `severity` | Integer | 1–5 |
| `department` | String(128) | e.g. "Public Works" |
| `lat` | Float | Latitude |
| `lng` | Float | Longitude |
| `address` | String(256) | Human-readable |
| `summary` | String(512) | AI-generated one-liner |
| `keywords` | JSON | List of tag strings |
| `original_text` | String(2048) | Raw citizen complaint text |
| `geohash` | String(16) | Indexed. precision-5 (~5km cell) |
| `status` | String(20) | Indexed. `"new"` / `"in_progress"` / `"resolved"` |
| `report_count` | Integer | Incremented by dedup |
| `priority_score` | Float | `severity × log1p(report_count)` |
| `created_at` | DateTime(tz) | UTC |
| `updated_at` | DateTime(tz) | UTC, auto on update |

### Pydantic Schemas

**ComplaintInput:**
```json
{ "text": "string (required)", "lat": "float | null", "lng": "float | null" }
```

**ComplaintAnalysis (LLM output):**
```json
{
  "category": "Pothole",
  "severity": 3,
  "department": "Public Works",
  "location": { "lat": 0.0, "lng": 0.0, "address": "" },
  "summary": "...",
  "keywords": ["pothole", "road", "damage"]
}
```

**TicketResponse:**
All Ticket columns + `is_duplicate: bool`

**TicketStatusUpdate:**
```json
{ "status": "new | in_progress | resolved" }
```

---

## Core Flows

### 1. Text Complaint Submission

```
Citizen types text
  → POST /complaints { text, lat?, lng? }
  → llm_service.analyze_complaint() calls Groq → ComplaintAnalysis JSON
  → dedup_service.find_or_create_ticket():
      - geohash(lat,lng) at precision 5
      - expand to 9 neighbour cells
      - query open tickets: same category + geohash IN neighbours
      - for each candidate: haversine < 200m? → YES: bump report_count, return (ticket, True)
      - NO match: create new ticket, return (ticket, False)
  → TicketResponse (includes is_duplicate flag)
```

### 2. Voice Complaint Submission

```
Citizen records audio via MediaRecorder API
  → POST /complaints/voice (multipart: audio file + lat + lng)
  → stt_service.transcribe_audio() calls Groq Whisper → text
  → same pipeline as text complaint
```

### 3. Admin Status Update

```
Admin clicks ticket on map/list
  → TicketDetail shows full info
  → Admin clicks "Start Working" or "Mark Resolved"
  → PATCH /tickets/{id}/status { status: "in_progress" | "resolved" }
  → resolved tickets get priority_score = 0.0
```

### 4. Citizen Status Tracking

```
Citizen enters ticket ID
  → GET /tickets/{id}
  → StatusTracker shows timeline: New → In Progress → Resolved
```

---

## Dedup Algorithm

**Purpose:** Prevent duplicate tickets when multiple citizens report the same issue.

1. **Geohash** the incoming complaint coordinates at precision 5 (~5km cell)
2. **Expand** to all 8 neighbouring cells (avoid edge-of-cell misses)
3. **Query** DB for open tickets where `category == incoming.category AND geohash IN expanded_cells`
4. **Haversine** distance check: for each candidate, if distance < 200 metres → **duplicate found**
5. **If duplicate:** increment `report_count`, recalculate `priority_score`, return existing ticket
6. **If no duplicate:** create new ticket

**Priority scoring:** `priority_score = severity × log1p(report_count)`
- This means a severity-3 issue with 10 reports (score ~7.2) outranks a severity-5 issue with 1 report (score ~3.5)

---

## Environment Variables

File: `sentinel/backend/.env`

| Variable | Required | Default | Description |
|---|---|---|---|
| `GROQ_API_KEY` | ✅ | — | Get from https://console.groq.com/keys |
| `DATABASE_URL` | ❌ | `sqlite+aiosqlite:///./sentinel.db` | Async SQLAlchemy connection string |

---

## Running the Project

### Prerequisites
- Python 3.13+
- Node.js 18+
- Groq API key

### Commands

```bash
# Backend (from sentinel/backend/)
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000

# Citizen Frontend (from sentinel/frontend-citizen/)
npm install
npm run dev -- --port 5173

# Admin Frontend (from sentinel/frontend-admin/)
npm install
npm run dev -- --port 5174
```

### Ports

| Service | Port | URL |
|---|---|---|
| Backend API | 8000 | http://localhost:8000 |
| Citizen App | 5173 | http://localhost:5173 |
| Admin Dashboard | 5174 | http://localhost:5174 |
| API Docs | 8000 | http://localhost:8000/docs |

---

## Frontend Architecture

### Citizen App (port 5173)

**Pages:**
- `SubmitComplaint` → wraps `ComplaintForm`
- `TrackTicket` → wraps `StatusTracker`

**Components:**
- `ComplaintForm` — 3-step wizard (input → AI analysis preview → success). Supports text and voice modes. Shows dedup-aware messaging when the same issue was already reported.
- `VoiceRecorder` — Uses `MediaRecorder` API, captures audio as WebM blob, shows recording timer.
- `StatusTracker` — Enter ticket ID, shows status with visual timeline (New → In Progress → Resolved).

**API Client (`api/client.js`):**
- `analyzeComplaint(text, lat?, lng?)` — `POST /complaints/analyze`
- `submitComplaint(text, lat?, lng?)` — `POST /complaints`
- `submitVoiceComplaint(audioBlob, lat?, lng?)` — `POST /complaints/voice` (multipart)
- `getTicket(id)` — `GET /tickets/{id}`

### Admin App (port 5174)

**Pages:**
- `Dashboard` — stats bar, filter tabs, view mode toggle, 3-pane layout

**Components:**
- `TicketMap` — Leaflet `MapContainer` with `CircleMarker` per ticket. Radius = `8 + severity*2`. Color by severity (green→red). Reduced opacity for resolved. Click selects.
- `TicketList` — Rows with severity color bar, category, summary, department, report count fire emoji, status badge. Click selects.
- `TicketDetail` — Full ticket info, stats row (reports/priority/date), tags, one-click status transitions. New→"Start Working"(in_progress). In Progress→"Mark Resolved"(resolved).

**State:**
- `tickets[]` — fetched on mount and auto-refreshed every 30 seconds
- `selected` — currently selected ticket (shared between map/list/detail)
- `filter` — status filter (`all`/`new`/`in_progress`/`resolved`)
- `view` — layout mode (`split`/`map`/`list`)

**API Client (`api/client.js`):**
- `getTickets(params?)` — `GET /tickets?status=&department=&category=`
- `getTicket(id)` — `GET /tickets/{id}`
- `updateTicketStatus(id, status)` — `PATCH /tickets/{id}/status`

---

## Design System

Both frontends use a **dark glassmorphism** theme:

- Background: `#060d1a` with radial gradient ambience
- Surface: `rgba(255,255,255,0.04)` with `backdrop-filter: blur(12px)`
- Border: `rgba(255,255,255,0.08)`
- Accent: `#3b82f6` (blue) + `#6366f1` (indigo)
- Typography: Inter (Google Fonts), weights 300–800
- Animations: pulse dots for recording, spin for loading, smooth hover transitions

**Severity color scale:**
| Level | Color | Label |
|---|---|---|
| 1 | `#4ade80` (green) | Minor |
| 2 | `#a3e635` (lime) | Low |
| 3 | `#facc15` (amber) | Moderate |
| 4 | `#fb923c` (orange) | High |
| 5 | `#f87171` (red) | Critical |

---

## Known Limitations (MVP)

1. **No authentication** — no login for citizen or admin
2. **No image upload** — text and voice only (image analysis is a stretch goal)
3. **No SLA timers** — no auto-escalation (stretch goal)
4. **No email notifications** — status updates are poll-based only
5. **SQLite** — single-writer, not suitable for production scale
6. **No before/after CV verification** — stretch goal for resolved tickets

---

## Bug Fixes Applied

| File | Issue | Fix |
|---|---|---|
| `llm_service.py` | No error handling for Groq API failures or malformed JSON | Added try/except around API call and JSON parsing, severity clamping |
| `stt_service.py` | `.strip()` on Whisper response fails if SDK returns object not string | Handle both str and Transcription object types safely |
| `tickets.py` | `total` count was unfiltered (separate COUNT(*) query) | Changed to `len(tickets)` so total matches filtered results |
| `complaints.py` | Setting `is_duplicate` on frozen Pydantic model raises error | model_validate → model_dump → update dict → reconstruct |
| `dedup_service.py` | Unused `Optional` import | Removed |
| `requirements.txt` | `SQLAlchemy==2.0.30` crashes on Python 3.13 | Pinned to `>=2.0.36` |
| `requirements.txt` | `python-geohash` needs C++ build tools | Replaced with `pygeohash` (pure Python) |
| `requirements.txt` | `pydantic==2.7.1` needs Rust/C++ to build `pydantic-core` | Upgraded to `2.10.6` (pre-built wheel available) |

---

## Stretch Goals (Not Implemented)

- Image upload + vision analysis (Gemini free tier / YOLO)
- Before/after CV verification on ticket closure
- SLA countdown timer + auto-escalation rules
- Email/SMS status notifications
- User authentication (citizen accounts, admin roles)
- PostgreSQL migration for production
