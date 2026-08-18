# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException
# pyrefly: ignore [missing-import]
from sqlalchemy import select, func
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.models.ticket import Ticket
from app.schemas.ticket import TicketResponse, TicketStatusUpdate, TicketListResponse
from app.services.priority_service import compute_priority_score

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.get("", response_model=TicketListResponse)
async def list_tickets(
    status: Optional[str] = None,
    department: Optional[str] = None,
    category: Optional[str] = None,
    severity: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    """List all tickets, sorted by priority score descending."""
    stmt = select(Ticket).order_by(Ticket.priority_score.desc())
    if status:
        stmt = stmt.where(Ticket.status == status)
    if department:
        stmt = stmt.where(Ticket.department == department)
    if category:
        stmt = stmt.where(Ticket.category == category)
    if severity:
        stmt = stmt.where(Ticket.severity == severity)

    result = await db.execute(stmt)
    tickets = result.scalars().all()

    return TicketListResponse(
        tickets=[TicketResponse.model_validate(t) for t in tickets],
        total=len(tickets),
    )


@router.post("/seed", response_model=TicketListResponse)
async def seed_tickets(db: AsyncSession = Depends(get_db)):
    """Explicitly seed demo civic incidents into sentinel.db."""
    from datetime import datetime, timedelta, timezone
    import pygeohash as gh
    from app.services.priority_service import compute_priority_score

    now = datetime.now(timezone.utc)
    sample_data = [
        {
            "category": "Structural Failure",
            "severity": 5,
            "department": "Road Infrastructure",
            "lat": 28.6139,
            "lng": 77.2090,
            "address": "Flyover Pillar 14, Ring Road, New Delhi",
            "summary": "Deep structural cracks observed on flyover support pillar with exposed rebar.",
            "keywords": ["bridge", "crack", "pillar", "structural", "danger"],
            "original_text": "Huge cracks on pillar 14 of the main flyover. Concrete chunks are falling on the road below!",
            "status": "in_progress",
            "report_count": 7,
            "days_ago": 0.1,
        },
        {
            "category": "Chemical Leak",
            "severity": 4,
            "department": "Industrial Safety",
            "lat": 28.5355,
            "lng": 77.3910,
            "address": "Plot 42, Sector 80 Industrial Area, Noida",
            "summary": "Pungent chemical vapor leak from chemical storage tanker valve.",
            "keywords": ["gas", "fumes", "leak", "chemical", "toxic"],
            "original_text": "Strong sulfur smell and white vapor leaking from chemical facility near worker quarters.",
            "status": "in_progress",
            "report_count": 5,
            "days_ago": 0.5,
        },
        {
            "category": "Water Leakage",
            "severity": 4,
            "department": "Water Department",
            "lat": 28.7041,
            "lng": 77.1025,
            "address": "Block C Main Junction, Rohini Sector 9",
            "summary": "High-pressure potable water main burst flooding intersection.",
            "keywords": ["water", "pipe burst", "flooding", "pipeline"],
            "original_text": "Major water pipe burst on main road. Water shooting 10ft high and flooding nearby shops.",
            "status": "new",
            "report_count": 3,
            "days_ago": 1.2,
        },
        {
            "category": "Pothole",
            "severity": 3,
            "department": "Road Infrastructure",
            "lat": 28.6289,
            "lng": 77.2065,
            "address": "Ashoka Road near Metro Station Exit 2",
            "summary": "Large 4-foot wide pothole causing traffic obstruction and bike accidents.",
            "keywords": ["pothole", "road damage", "accident hazard"],
            "original_text": "Massive pothole in middle of lane. Two bikes skidded yesterday.",
            "status": "new",
            "report_count": 4,
            "days_ago": 2.0,
        },
        {
            "category": "Street Light",
            "severity": 2,
            "department": "Electrical",
            "lat": 28.5800,
            "lng": 77.2300,
            "address": "Lajpat Nagar IV, Lane 3",
            "summary": "Series of 5 streetlights non-functional creating dark stretch.",
            "keywords": ["street light", "darkness", "safety", "bulb"],
            "original_text": "Entire lane is completely dark for 3 days due to faulty streetlights.",
            "status": "resolved",
            "report_count": 2,
            "days_ago": 4.5,
        },
        {
            "category": "Garbage",
            "severity": 3,
            "department": "Sanitation",
            "lat": 28.6500,
            "lng": 77.2400,
            "address": "Daryaganj Market Waste Collection Point",
            "summary": "Overflowing waste dump blocking sidewalk and drainage channel.",
            "keywords": ["waste", "garbage", "overflow", "sanitation"],
            "original_text": "Garbage has not been collected for a week. Huge pile blocking the pedestrian path.",
            "status": "resolved",
            "report_count": 6,
            "days_ago": 5.0,
        },
        {
            "category": "Pothole",
            "severity": 4,
            "department": "Road Infrastructure",
            "lat": 28.6350,
            "lng": 77.2250,
            "address": "Barakhamba Road Crossing",
            "summary": "Sunken road trench near pedestrian crossing.",
            "keywords": ["road", "trench", "pothole", "traffic"],
            "original_text": "Deep depression formed across the lane after sewer work.",
            "status": "resolved",
            "report_count": 3,
            "days_ago": 6.2,
        },
        {
            "category": "Water Leakage",
            "severity": 3,
            "department": "Water Department",
            "lat": 28.5700,
            "lng": 77.1900,
            "address": "Hauz Khas Enclave Gate 1",
            "summary": "Sub-surface pipeline leak causing waterlogging on service road.",
            "keywords": ["leak", "water", "service road"],
            "original_text": "Clean water seeping through tarmac since Tuesday morning.",
            "status": "in_progress",
            "report_count": 2,
            "days_ago": 3.1,
        },
        {
            "category": "Industrial Safety",
            "severity": 5,
            "department": "Industrial Safety",
            "lat": 28.5200,
            "lng": 77.3000,
            "address": "Okhla Phase III Heavy Machinery Yard",
            "summary": "Improper crane stability and lack of perimeter barricades during heavy lift.",
            "keywords": ["crane", "safety", "hazard", "heavy machinery"],
            "original_text": "Crane tilted precariously over public boundary wall with no safety cordon.",
            "status": "resolved",
            "report_count": 1,
            "days_ago": 7.0,
        },
        {
            "category": "Garbage",
            "severity": 2,
            "department": "Sanitation",
            "lat": 28.6100,
            "lng": 77.2200,
            "address": "Khan Market Outer Circle",
            "summary": "Commercial packaging waste accumulated in rear alley.",
            "keywords": ["sanitation", "garbage", "commercial waste"],
            "original_text": "Cardboard boxes and restaurant waste dumped in alleyway.",
            "status": "resolved",
            "report_count": 1,
            "days_ago": 8.0,
        },
        {
            "category": "Electrical",
            "severity": 4,
            "department": "Electrical",
            "lat": 28.6400,
            "lng": 77.2100,
            "address": "Pahar Ganj Central Market",
            "summary": "Sparking transformer box near pedestrian walkway.",
            "keywords": ["transformer", "sparking", "electrical hazard", "fire"],
            "original_text": "Transformer sparking loudly with burning plastic smell right outside market entrance.",
            "status": "in_progress",
            "report_count": 4,
            "days_ago": 1.8,
        },
        {
            "category": "Pothole",
            "severity": 3,
            "department": "Road Infrastructure",
            "lat": 28.5500,
            "lng": 77.2600,
            "address": "Nehru Place Outer Ring Ramp",
            "summary": "Multiple asphalt craters along the flyover descent lane.",
            "keywords": ["crater", "potholes", "flyover", "asphalt"],
            "original_text": "Cluster of 3 sharp potholes right at the curve of the ramp.",
            "status": "resolved",
            "report_count": 5,
            "days_ago": 9.5,
        }
    ]

    created_tickets = []
    for item in sample_data:
        dt = now - timedelta(days=item["days_ago"])
        score = compute_priority_score(item["severity"], item["report_count"])
        if item["status"] == "resolved":
            score = 0.0
        geohash_str = gh.encode(item["lat"], item["lng"], precision=5)
        ticket = Ticket(
            category=item["category"],
            severity=item["severity"],
            department=item["department"],
            lat=item["lat"],
            lng=item["lng"],
            address=item["address"],
            summary=item["summary"],
            keywords=item["keywords"],
            original_text=item["original_text"],
            geohash=geohash_str,
            status=item["status"],
            report_count=item["report_count"],
            priority_score=score,
            created_at=dt,
            updated_at=dt + timedelta(hours=6) if item["status"] == "resolved" else dt,
        )
        db.add(ticket)
        created_tickets.append(ticket)

    await db.commit()
    for t in created_tickets:
        await db.refresh(t)

    return TicketListResponse(
        tickets=[TicketResponse.model_validate(t) for t in created_tickets],
        total=len(created_tickets),
    )


@router.get("/{ticket_id}", response_model=TicketResponse)
async def get_ticket(ticket_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single ticket by ID (used for citizen status tracking)."""
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")
    return TicketResponse.model_validate(ticket)


@router.patch("/{ticket_id}/status", response_model=TicketResponse)
async def update_ticket_status(
    ticket_id: int,
    update: TicketStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Admin endpoint — update ticket status (new → in_progress → resolved)."""
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")

    ticket.status = update.status
    # Resolved tickets drop to zero priority
    if update.status == "resolved":
        ticket.priority_score = 0.0
    await db.commit()
    await db.refresh(ticket)
    return TicketResponse.model_validate(ticket)
