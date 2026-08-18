# 🛡️ Sentinel — Project Analysis & 3-Member Task Assignment

**Project:** Sentinel — Civic Complaint Intelligence Platform  
**Target:** IEEE Conference / Hackathon Deliverable  
**Stack:** FastAPI · Groq LLaMA 3.3 & Whisper · SQLAlchemy + SQLite · React 19 + Vite · Leaflet GIS  

---

## 1. Project Analysis & System Architecture

Sentinel is an AI-powered civic complaint intelligence and dispatch platform designed to automate the intake, categorization, spatial deduplication, prioritization, and resolution tracking of citizen reports.

```
                               ┌────────────────────────────────┐
                               │        CITIZEN PORTAL          │
                               │  (Text / Voice / Geolocation)  │
                               └───────────────┬────────────────┘
                                               │ HTTP / Multipart
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                FASTAPI BACKEND ENGINE                                   │
│                                                                                         │
│  ┌──────────────────────┐    ┌────────────────────────┐    ┌─────────────────────────┐  │
│  │     Groq Whisper     │───▶│     Groq LLaMA 3.3     │───▶│    Geospatial Dedup     │  │
│  │ (Speech-to-Text STT) │    │  (Category/Severity/   │    │ (Geohash-5 + Haversine  │  │
│  │                      │    │   Department Triage)   │    │     200m Clustering)    │  │
│  └──────────────────────┘    └────────────────────────┘    └────────────┬────────────┘  │
│                                                                         │               │
│                                                                         ▼               │
│                                                              ┌───────────────────────┐  │
│                                                              │ Priority Score Engine │  │
│                                                              │ severity × ln(count+1)│  │
│                                                              └──────────┬────────────┘  │
│                                                                         │               │
│                                                                         ▼               │
│                                                              ┌───────────────────────┐  │
│                                                              │  SQLite / PostgreSQL  │  │
│                                                              └──────────┬────────────┘  │
└─────────────────────────────────────────────────────────────────────────┼───────────────┘
                                                                          │
                                               ┌──────────────────────────┴───────────────┐
                                               ▼                                          ▼
                                ┌─────────────────────────────┐            ┌─────────────────────────────┐
                                │       ADMIN DASHBOARD       │            │       STATUS TRACKER        │
                                │   (Leaflet Map & Dispatch)  │            │     (Citizen Real-Time)     │
                                └─────────────────────────────┘            └─────────────────────────────┘
```

### Core Algorithms & Logic
1. **Multi-Modal Ingestion:** Accepts structured text input or voice recordings (processed via Groq Whisper `whisper-large-v3`).
2. **AI Triage & Structuring:** Groq `llama-3.3-70b-versatile` extracts category, severity (1–5), assigned department, summary, and keywords into a strict Pydantic JSON schema.
3. **Geospatial Deduplication (Geohash + Haversine):**
   - Geohashes incoming coordinates at precision 5 (~5 km).
   - Queries open tickets within the target cell and its 8 neighboring cells.
   - Computes Haversine distance. If distance $< 200\text{ m}$ with identical category, increments `report_count` instead of creating a new ticket.
4. **Dynamic Priority Scoring:**
   $$\text{Priority Score} = \text{Severity} \times \ln(\text{Report Count} + 1)$$
   Ensures recurring community issues naturally escalate above isolated high-severity events.

---

## 2. 3-Member Task Allocation Matrix

```
┌─────────────────────────────────┬─────────────────────────────────┬─────────────────────────────────┐
│            MEMBER 1             │            MEMBER 2             │            MEMBER 3             │
│   Backend, AI & ML Pipeline     │   Frontend, GIS & UI/UX Lead    │  DevOps, Security & IEEE Paper  │
├─────────────────────────────────┼─────────────────────────────────┼─────────────────────────────────┤
│ • Groq LLM & Whisper Pipeline   │ • Admin GIS Command Center      │ • JWT Auth & RBAC               │
│ • Computer Vision (Image Proof) │ • Citizen Portal & Geolocation  │ • Docker & Cloud Deployment     │
│ • SLA Auto-Escalation Engine    │ • Heatmaps & Cluster Pins       │ • Synthetic Data & Benchmarks   │
│ • Geospatial Dedup Refinement   │ • Real-time SLA Countdown Clocks│ • IEEE Research Paper Draft     │
│ • Multi-Language Translation    │ • Analytics Charts & Trends     │ • Live Demo Script & Deck       │
└─────────────────────────────────┴─────────────────────────────────┴─────────────────────────────────┘
```

---

## 3. Individual Member Work Breakdown Structure (WBS)

### 👤 Member 1: Backend, AI/ML & Core Pipeline Lead

**Primary Focus:** Backend reliability, multi-modal vision enhancements, background workers, and NLP/audio optimization.

| Task ID | Task Title | Description | Target Files |
|---|---|---|---|
| **M1-01** | **Computer Vision Image Analysis** | Integrate Gemini Vision API / YOLO endpoint to analyze citizen photo uploads, classify issue type (e.g. pothole, garbage spill), and compute visual damage severity. | `backend/app/services/vision_service.py`<br>`backend/app/routers/complaints.py` |
| **M1-02** | **Resolution Verification (Before/After CV)** | Build an endpoint that compares closure proof photos against initial report photos to verify resolved tickets before status update. | `backend/app/services/vision_service.py`<br>`backend/app/routers/tickets.py` |
| **M1-03** | **Automated SLA & Escalation Engine** | Implement background scheduling (using `APScheduler` or async tasks) that tracks ticket age against severity SLAs (e.g., Critical: 24h, High: 48h) and auto-escalates overdue items. | `backend/app/services/sla_service.py`<br>`backend/app/models/ticket.py` |
| **M1-04** | **Multi-Language & Dialect Support** | Update Groq system prompt to detect and translate non-English complaints (Hindi, Spanish, etc.) into structured English while keeping original text. | `backend/app/services/llm_service.py` |
| **M1-05** | **Database Migration & Performance** | Set up Alembic database migrations and configure PostgreSQL adapter for production scalability. | `backend/alembic/`<br>`backend/app/database.py` |

---

### 👤 Member 2: Frontend, GIS & UI/UX Lead

**Primary Focus:** Interactive command centers, responsive citizen experiences, geospatial data visualizations, and telemetry UI.

| Task ID | Task Title | Description | Target Files |
|---|---|---|---|
| **M2-01** | **Admin GIS Command Center & Heatmaps** | Add Leaflet Heatmap layer (`leaflet.heat`), marker clustering (`react-leaflet-cluster`), and satellite/dark map tile toggling to the admin dashboard. | `frontend-admin/src/components/TicketMap.jsx`<br>`frontend-admin/src/pages/Dashboard.jsx` |
| **M2-02** | **Citizen Geolocation & Reverse Geocoding** | Integrate HTML5 Geolocation API with OpenStreetMap Nominatim reverse geocoding to auto-fill street addresses and allow pinpoint map picking. | `frontend-citizen/src/components/GeoPicker.jsx`<br>`frontend-citizen/src/components/ComplaintForm.jsx` |
| **M2-03** | **Image Upload & Canvas Annotation UI** | Add drag-and-drop image upload with client-side image compression, preview modal, and before/after comparison slider. | `frontend-citizen/src/components/ImageUpload.jsx`<br>`frontend-admin/src/components/TicketDetail.jsx` |
| **M2-04** | **Real-Time Telemetry & SLA Countdown** | Build visual countdown widgets showing remaining SLA time per ticket, with amber/red flashing alerts for near-breach status. | `frontend-admin/src/components/SLATimer.jsx`<br>`frontend-admin/src/App.css` |
| **M2-05** | **Municipal Analytics Dashboard** | Implement charts (via `Chart.js` or `Recharts`) showing resolution rates, top problem categories, and department efficiency metrics. | `frontend-admin/src/pages/Analytics.jsx` |

---

### 👤 Member 3: Security, DevOps, Benchmarking & IEEE Research Lead

**Primary Focus:** Authentication & access control, containerization, synthetic benchmark datasets, performance metrics, and IEEE conference paper writing.

| Task ID | Task Title | Description | Target Files |
|---|---|---|---|
| **M3-01** | **Authentication & Role-Based Access (RBAC)** | Add JWT authentication for Admin and Department Officers (`Public Works`, `Sanitation`, `Traffic`) with protected FastAPI endpoints. | `backend/app/auth/`<br>`backend/app/routers/auth.py` |
| **M3-02** | **Synthetic Dataset & Benchmark Suite** | Write a benchmark generator script creating 100+ realistic civic complaints to evaluate geohash deduplication accuracy, latency, and LLM throughput. | `scripts/seed_and_benchmark.py`<br>`docs/benchmark_results.md` |
| **M3-03** | **Dockerization & CI/CD Deployment** | Write production `Dockerfile`s for backend, citizen, and admin frontends, plus `docker-compose.yml` for 1-command startup and cloud deployment (Render/Vercel). | `docker-compose.yml`<br>`Dockerfile` in all services |
| **M3-04** | **IEEE Research Paper Draft** | Write a conference-ready paper covering: Problem Background, Architecture, Priority Mathematical Formulation, Dedup Accuracy, and Benchmark Results. | `docs/ieee_paper_draft.md` |
| **M3-05** | **Demonstration Deck & Presentation Script** | Prepare a 10-slide presentation deck + 3-minute structured live demonstration script walking through voice filing, AI triage, dedup merging, and admin resolution. | `docs/demo-script.md`<br>`docs/presentation_slides.md` |

---

## 4. 3-Phase Sprint Roadmap

```
PHASE 1: Foundation & Core Upgrades (Days 1–2)
├── Member 1: Vision service skeleton & Multi-language prompt engineering
├── Member 2: Citizen Geolocation auto-detect & Image upload UI
└── Member 3: JWT Authentication & Docker Compose configuration

PHASE 2: Advanced Features & Real-Time Intelligence (Days 3–4)
├── Member 1: SLA Auto-Escalation Engine & Before/After CV Verification
├── Member 2: Leaflet Heatmaps, Cluster Markers & Analytics Charts
└── Member 3: Synthetic Data Generator (100+ items) & Benchmarking

PHASE 3: Evaluation, Documentation & Demo Polish (Days 5–6)
├── Member 1: Backend Load Testing & Error Recovery
├── Member 2: UI Polish, Dark Glassmorphism Refinements & Mobile Layouts
└── Member 3: IEEE Paper Finalization, Slide Deck & Demo Rehearsal
```

---

## 5. Cross-Functional API Contract & Team Coordination

1. **API Schema First:** Member 1 updates Pydantic schemas in `backend/app/schemas/` before Member 2 builds corresponding frontend views.
2. **Environment Consistency:** Member 3 manages `.env.example` and `docker-compose.yml` so all members work in identical environments.
3. **Mock Data Availability:** Frontend development can proceed using mock endpoints or sample payloads while backend services are in progress.

---

## 6. Quickstart Command Reference

```bash
# 1. Backend (FastAPI + Groq)
cd sentinel/backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000

# 2. Citizen Frontend (React + Vite)
cd sentinel/frontend-citizen
npm install
npm run dev -- --port 5173

# 3. Admin Dashboard (React + Leaflet)
cd sentinel/frontend-admin
npm install
npm run dev -- --port 5174
```
