import os
import io
import math
import asyncio
import pytest
import httpx
import numpy as np
from PIL import Image
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select

from app.config import settings
from app.database import Base
from app.models.ticket import Ticket
from app.schemas.complaint import ComplaintInput, ComplaintAnalysis, LocationInfo
from app.schemas.ticket import TicketStatusUpdate
from app.services.llm_service import analyze_complaint
from app.services.stt_service import transcribe_audio
from app.services.dedup_service import find_or_create_ticket, _encode, _expand
from app.services.priority_service import compute_priority_score
from app.utils.geo import haversine
from app.main import app

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


def run_async(coro):
    return asyncio.run(coro)


# -------------------------------------------------------------
# 1. GEOSPATIAL & MATH TESTS
# -------------------------------------------------------------
def test_haversine_distance():
    # Mumbai to Delhi: ~1148 km
    dist_mum_delhi = haversine(19.0760, 72.8777, 28.6139, 77.2090)
    assert 1_140_000 < dist_mum_delhi < 1_160_000, f"Unexpected distance: {dist_mum_delhi}m"

    # Same point: 0 meters
    assert haversine(19.0760, 72.8777, 19.0760, 72.8777) == 0.0

    # Nearby points (~100m)
    dist_near = haversine(19.0760, 72.8777, 19.0769, 72.8777)
    assert 90 < dist_near < 120, f"Distance expected ~100m, got {dist_near}m"


def test_geohash_expansion():
    gh = _encode(19.0760, 72.8777)
    assert len(gh) == 5
    neighbours = _expand(gh)
    assert len(neighbours) == 9
    assert gh in neighbours


def test_priority_scoring_formula():
    assert compute_priority_score(5, 1) == round(5 * math.log1p(1), 4)
    s1 = compute_priority_score(3, 1)
    s2 = compute_priority_score(3, 5)
    s3 = compute_priority_score(3, 10)
    assert s1 < s2 < s3


# -------------------------------------------------------------
# 2. DATABASE CRUD & DEDUPLICATION TESTS
# -------------------------------------------------------------
async def _async_db_crud():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with async_session() as session:
        # CREATE
        ticket = Ticket(
            category="Pothole",
            severity=3,
            department="Public Works",
            lat=19.0760,
            lng=72.8777,
            address="MG Road, Fort, Mumbai",
            summary="Deep pothole causing traffic slowdown",
            keywords=["pothole", "road", "traffic"],
            original_text="There is a deep pothole on MG Road",
            geohash=_encode(19.0760, 72.8777),
            status="new",
            report_count=1,
            priority_score=compute_priority_score(3, 1),
        )
        session.add(ticket)
        await session.commit()
        await session.refresh(ticket)
        assert ticket.id is not None
        ticket_id = ticket.id

        # READ
        result = await session.execute(select(Ticket).where(Ticket.id == ticket_id))
        fetched = result.scalar_one_or_none()
        assert fetched is not None
        assert fetched.category == "Pothole"
        assert fetched.severity == 3

        # UPDATE
        fetched.status = "in_progress"
        await session.commit()
        await session.refresh(fetched)
        assert fetched.status == "in_progress"

        # DELETE
        await session.delete(fetched)
        await session.commit()
        result = await session.execute(select(Ticket).where(Ticket.id == ticket_id))
        assert result.scalar_one_or_none() is None

    await engine.dispose()


def test_database_crud():
    run_async(_async_db_crud())


async def _async_dedup_clustering():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with async_session() as session:
        # Base complaint at (19.0760, 72.8777)
        analysis1 = ComplaintAnalysis(
            category="Garbage",
            severity=2,
            department="Sanitation",
            location=LocationInfo(lat=19.0760, lng=72.8777, address="Street A"),
            summary="Overflowing garbage bin",
            keywords=["garbage", "bin"],
        )
        t1, is_dup1 = await find_or_create_ticket(session, analysis1, "Garbage dumping here")
        assert is_dup1 is False
        assert t1.report_count == 1

        # Second complaint 45m away -> same category -> DUP
        analysis2 = ComplaintAnalysis(
            category="Garbage",
            severity=2,
            department="Sanitation",
            location=LocationInfo(lat=19.0764, lng=72.8777, address="Street A near shop"),
            summary="Trash piling up on street",
            keywords=["trash"],
        )
        t2, is_dup2 = await find_or_create_ticket(session, analysis2, "Trash everywhere")
        assert is_dup2 is True
        assert t2.id == t1.id
        assert t2.report_count == 2
        assert t2.priority_score > compute_priority_score(2, 1)

        # Third complaint same location but DIFFERENT category (Streetlight) -> NOT DUP
        analysis3 = ComplaintAnalysis(
            category="Streetlight",
            severity=3,
            department="Electrical",
            location=LocationInfo(lat=19.0760, lng=72.8777, address="Street A"),
            summary="Dark street lamp",
            keywords=["light"],
        )
        t3, is_dup3 = await find_or_create_ticket(session, analysis3, "Light is out")
        assert is_dup3 is False
        assert t3.id != t1.id
        assert t3.report_count == 1

    await engine.dispose()


def test_dedup_clustering():
    run_async(_async_dedup_clustering())


# -------------------------------------------------------------
# 3. REAL GROQ LLM SERVICE TESTS
# -------------------------------------------------------------
async def _async_groq_llm():
    assert bool(settings.GROQ_API_KEY), "GROQ_API_KEY missing from environment"
    complaint = ComplaintInput(
        text="Massive sewage water leak flooding the main intersection of Sector 5, bad odor and health hazard.",
        lat=28.5355,
        lng=77.3910,
    )
    result = await analyze_complaint(complaint)
    assert isinstance(result, ComplaintAnalysis)
    assert result.severity in [1, 2, 3, 4, 5]
    assert result.severity >= 3, f"Expected high severity for sewage flooding, got {result.severity}"
    assert len(result.summary) > 5
    assert result.location.lat == 28.5355
    assert result.location.lng == 77.3910


def test_real_groq_llm_analysis():
    run_async(_async_groq_llm())


# -------------------------------------------------------------
# 4. COMPUTER VISION / YOLO TEST (ULTRALYTICS)
# -------------------------------------------------------------
def test_yolo_inference_pipeline():
    from ultralytics import YOLO
    
    model = YOLO("yolov8n.pt")
    assert model is not None

    img_array = np.zeros((480, 640, 3), dtype=np.uint8)
    img_array[100:300, 200:400] = [255, 255, 255]
    pil_img = Image.fromarray(img_array)

    results = model(pil_img, verbose=False)
    assert len(results) > 0
    res = results[0]
    assert hasattr(res, "boxes")


# -------------------------------------------------------------
# 5. FASTAPI ROUTE & LIFECYCLE TESTS (HTTPX)
# -------------------------------------------------------------
async def _async_fastapi_endpoints():
    from app.database import create_tables
    await create_tables()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as client:
        # 1. Health check
        res = await client.get("/health")
        assert res.status_code == 200
        assert res.json() == {"status": "healthy"}

        # 2. Root info
        res = await client.get("/")
        assert res.status_code == 200
        assert res.json()["service"] == "Sentinel API"

        # 3. Analyze complaint only
        res = await client.post("/complaints/analyze", json={
            "text": "Dead street light pole causing accidents at night near metro station",
            "lat": 19.0760,
            "lng": 72.8777
        })
        assert res.status_code == 200
        analysis = res.json()
        assert "category" in analysis
        assert "severity" in analysis
        assert "department" in analysis

        # 4. Submit real complaint
        res = await client.post("/complaints", json={
            "text": "Large pothole on 5th Avenue causing tire punctures",
            "lat": 12.9716,
            "lng": 77.5946
        })
        assert res.status_code == 200
        ticket1 = res.json()
        ticket_id = ticket1["id"]
        assert ticket1["status"] == "new"
        assert ticket1["is_duplicate"] is False
        assert ticket1["report_count"] == 1

        # 5. Submit duplicate complaint within 200m
        res_dup = await client.post("/complaints", json={
            "text": "Another car hit the huge pothole on 5th Avenue",
            "lat": 12.9718,
            "lng": 77.5946
        })
        assert res_dup.status_code == 200
        ticket_dup = res_dup.json()
        assert ticket_dup["id"] == ticket_id
        assert ticket_dup["is_duplicate"] is True
        assert ticket_dup["report_count"] == 2

        # 6. Fetch ticket by ID
        res_get = await client.get(f"/tickets/{ticket_id}")
        assert res_get.status_code == 200
        assert res_get.json()["id"] == ticket_id

        # 7. Update ticket status (new -> in_progress)
        res_patch = await client.patch(f"/tickets/{ticket_id}/status", json={"status": "in_progress"})
        assert res_patch.status_code == 200
        assert res_patch.json()["status"] == "in_progress"

        # 8. Update ticket status (in_progress -> resolved)
        res_res = await client.patch(f"/tickets/{ticket_id}/status", json={"status": "resolved"})
        assert res_res.status_code == 200
        assert res_res.json()["status"] == "resolved"
        assert res_res.json()["priority_score"] == 0.0

        # 9. List tickets
        res_list = await client.get("/tickets")
        assert res_list.status_code == 200
        list_data = res_list.json()
        assert list_data["total"] >= 1
        assert len(list_data["tickets"]) >= 1

        # 10. Error cases
        res_404 = await client.get("/tickets/99999999")
        assert res_404.status_code == 404

        res_422 = await client.patch(f"/tickets/{ticket_id}/status", json={"status": "invalid_status_enum"})
        assert res_422.status_code == 422


def test_fastapi_endpoints_e2e():
    run_async(_async_fastapi_endpoints())
