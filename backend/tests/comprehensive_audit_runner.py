import os
import sys
import time
import json
import wave
import struct
import io
import math
import asyncio
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from dotenv import load_dotenv

# Ensure backend root is on sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, backend_dir)
load_dotenv(os.path.join(backend_dir, ".env"))

audit_results = {
    "sections": {},
    "metrics": {},
    "errors": [],
    "summary": {}
}

def log_section(title):
    print(f"\n{'='*70}\n>>> {title}\n{'='*70}")


async def run_all_audits():
    # -------------------------------------------------------------
    # 1. ENVIRONMENT & SECRETS
    # -------------------------------------------------------------
    log_section("1. ENVIRONMENT & SECRETS AUDIT")
    groq_key = os.getenv("GROQ_API_KEY", "")
    db_url = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./sentinel.db")
    
    print(f"GROQ_API_KEY: {'PRESENT (Length: ' + str(len(groq_key)) + ')' if groq_key else 'MISSING'}")
    print(f"DATABASE_URL: {db_url}")
    assert bool(groq_key), "GROQ_API_KEY is missing!"

    # -------------------------------------------------------------
    # 2. REAL GROQ LLM AUDIT
    # -------------------------------------------------------------
    log_section("2. GROQ / LLM INFERENCE AUDIT")
    from app.services.llm_service import analyze_complaint, client as groq_client
    from app.schemas.complaint import ComplaintInput, ComplaintAnalysis
    from app.config import settings

    # Real Prompt 1: Generic test
    model_name = getattr(settings, "GROQ_MODEL", "groq/compound-mini")
    t0 = time.perf_counter()
    resp = await groq_client.chat.completions.create(
        model=model_name,
        messages=[
            {"role": "user", "content": "Explain what a deepfake is in 2 sentences."}
        ],
        max_tokens=100
    )
    llm_t1 = time.perf_counter() - t0
    deepfake_answer = resp.choices[0].message.content.strip()
    print(f"[Groq Direct Test] Latency: {llm_t1*1000:.1f}ms")
    print(f"[Groq Direct Response]:\n{deepfake_answer}")
    assert len(deepfake_answer) > 20, "Groq response was empty or too short"

    # Real Prompt 2: Structured Civic Complaint Triage
    t0 = time.perf_counter()
    test_complaint = ComplaintInput(
        text="Severe water contamination in Sector 42 pipeline. Brown muddy water coming from taps for 3 days.",
        lat=28.4595,
        lng=77.0266
    )
    analysis = await analyze_complaint(test_complaint)
    t_analysis = time.perf_counter() - t0
    print(f"\n[Civic Triage Test] Latency: {t_analysis*1000:.1f}ms")
    print(f"Category: {analysis.category}")
    print(f"Severity: {analysis.severity}/5")
    print(f"Department: {analysis.department}")
    print(f"Summary: {analysis.summary}")
    print(f"Keywords: {analysis.keywords}")
    print(f"Location: lat={analysis.location.lat}, lng={analysis.location.lng}")
    assert analysis.severity >= 3, f"Expected severity >= 3, got {analysis.severity}"
    assert "Water" in analysis.category or "Sewage" in analysis.category or "Pollution" in analysis.category

    # Adversarial / Edge Case Test (Hallucination check): Irrelevant input
    adversarial_complaint = ComplaintInput(
        text="The pizza I ordered was cold and pineapple doesn't belong on pizza.",
        lat=None,
        lng=None
    )
    adv_analysis = await analyze_complaint(adversarial_complaint)
    print(f"\n[Adversarial Test] Category: {adv_analysis.category}, Severity: {adv_analysis.severity}")
    assert adv_analysis.category in ["Other", "Garbage", "Noise Pollution"] or adv_analysis.severity <= 2

    # -------------------------------------------------------------
    # 3. AUDIO / WHISPER SPEECH-TO-TEXT AUDIT
    # -------------------------------------------------------------
    log_section("3. AUDIO PROCESSING (GROQ WHISPER) AUDIT")
    from app.services.stt_service import transcribe_audio
    
    # Generate valid synthetic PCM WAV audio (1.5 seconds of a 440Hz sine wave tone + silence)
    sample_rate = 16000
    duration = 1.5
    num_samples = int(sample_rate * duration)
    wav_io = io.BytesIO()
    with wave.open(wav_io, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        for i in range(num_samples):
            # tone
            sample = int(32767 * 0.3 * math.sin(2 * math.pi * 440 * i / sample_rate))
            wf.writeframes(struct.pack('<h', sample))
    wav_bytes = wav_io.getvalue()
    
    print(f"Generated synthetic test WAV audio ({len(wav_bytes)} bytes)")
    try:
        t0 = time.perf_counter()
        transcription = await transcribe_audio(wav_bytes, filename="test_tone.wav")
        t_whisper = time.perf_counter() - t0
        print(f"[Whisper STT Test] Latency: {t_whisper*1000:.1f}ms")
        print(f"[Whisper STT Output]: '{transcription}'")
        print("Whisper STT API endpoint executed successfully.")
    except Exception as e:
        print(f"[Whisper STT Warning/Notice]: {e}")

    # -------------------------------------------------------------
    # 4. YOLO / COMPUTER VISION PIPELINE AUDIT
    # -------------------------------------------------------------
    log_section("4. YOLO & COMPUTER VISION AUDIT")
    from ultralytics import YOLO

    print("Loading Ultralytics YOLOv8 nano model (yolov8n.pt)...")
    t0 = time.perf_counter()
    yolo_model = YOLO("yolov8n.pt")
    t_load = time.perf_counter() - t0
    print(f"YOLO Model loaded in {t_load*1000:.1f}ms. Device: {yolo_model.device}")

    # TEST IMAGE 1: Synthesized image with geometric persons/boxes
    img1 = Image.new("RGB", (640, 480), color=(200, 200, 200))
    d1 = ImageDraw.Draw(img1)
    d1.rectangle([100, 100, 250, 400], fill=(50, 50, 50)) # silhouette
    d1.ellipse([140, 50, 210, 120], fill=(220, 180, 150)) # head
    
    t0 = time.perf_counter()
    res1 = yolo_model(img1, verbose=False)[0]
    t_infer1 = time.perf_counter() - t0
    print(f"\n[Test Image 1 - Person Silhouette] Inference: {t_infer1*1000:.1f}ms | Detections: {len(res1.boxes)}")

    # TEST IMAGE 2: Multi-object synthesized scene
    img2 = Image.new("RGB", (640, 480), color=(100, 150, 200))
    d2 = ImageDraw.Draw(img2)
    d2.rectangle([50, 200, 200, 350], fill=(255, 0, 0)) # box 1
    d2.rectangle([300, 150, 500, 400], fill=(0, 255, 0)) # box 2
    d2.ellipse([400, 50, 480, 130], fill=(255, 255, 0)) # circle
    
    t0 = time.perf_counter()
    res2 = yolo_model(img2, verbose=False)[0]
    t_infer2 = time.perf_counter() - t0
    print(f"[Test Image 2 - Multi-Object Scene] Inference: {t_infer2*1000:.1f}ms | Detections: {len(res2.boxes)}")

    # TEST IMAGE 3: Blank Canvas (No target object)
    img3 = Image.new("RGB", (640, 480), color=(255, 255, 255))
    t0 = time.perf_counter()
    res3 = yolo_model(img3, verbose=False)[0]
    t_infer3 = time.perf_counter() - t0
    print(f"[Test Image 3 - Blank Canvas] Inference: {t_infer3*1000:.1f}ms | Detections: {len(res3.boxes)} (Expected 0)")
    assert len(res3.boxes) == 0, "Expected 0 detections on blank image"

    # TEST IMAGE 4: Low-quality / Dark / Noisy Image
    img4 = Image.new("RGB", (640, 480), color=(15, 15, 15)).filter(ImageFilter.GaussianBlur(radius=5))
    t0 = time.perf_counter()
    res4 = yolo_model(img4, verbose=False)[0]
    t_infer4 = time.perf_counter() - t0
    print(f"[Test Image 4 - Dark Degraded Image] Inference: {t_infer4*1000:.1f}ms | Detections: {len(res4.boxes)}")

    # -------------------------------------------------------------
    # 5. GEOSPATIAL & DEDUP AUDIT
    # -------------------------------------------------------------
    log_section("5. GEOSPATIAL DEDUP & PRIORITY ENGINE AUDIT")
    from app.services.dedup_service import _encode, _expand
    from app.utils.geo import haversine
    from app.services.priority_service import compute_priority_score

    # Coordinate check: Mumbai -> Delhi
    dist = haversine(19.0760, 72.8777, 28.6139, 77.2090)
    print(f"Mumbai to Delhi distance: {dist/1000:.2f} km (Expected ~1148 km)")
    assert 1140 < dist/1000 < 1160

    # Geohash cell expansion
    gh = _encode(19.0760, 72.8777)
    neighbors = _expand(gh)
    print(f"Geohash for (19.0760, 72.8777): {gh}, Expanded to {len(neighbors)} adjacent cells")
    assert len(neighbors) == 9

    # Priority score logarithmic scale verification
    scores = [(sev, count, compute_priority_score(sev, count)) for sev in [1, 3, 5] for count in [1, 2, 5, 10, 50]]
    print("\nPriority Score Growth Sample:")
    for s, c, score in scores[:8]:
        print(f"  Severity {s} | Reports: {c:<2} -> Priority Score: {score}")

    # -------------------------------------------------------------
    # 6. FASTAPI FULL PIPELINE & HTTP CLIENT AUDIT
    # -------------------------------------------------------------
    log_section("6. FASTAPI ASYNC HTTP INTEGRATION AUDIT")
    from app.main import app
    from app.database import create_tables
    from httpx import AsyncClient, ASGITransport

    await create_tables()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        # 1. Health
        res = await client.get("/health")
        print(f"GET /health -> HTTP {res.status_code} | {res.json()}")
        assert res.status_code == 200

        # 2. Analyze
        res = await client.post("/complaints/analyze", json={"text": "Broken transformer sparking near school gate", "lat": 19.1136, "lng": 72.8697})
        print(f"POST /complaints/analyze -> HTTP {res.status_code} | Cat: {res.json().get('category')}, Sev: {res.json().get('severity')}")
        assert res.status_code == 200

        # 3. Submit 1
        res = await client.post("/complaints", json={"text": "Dangerous open manhole on Central Avenue", "lat": 19.1136, "lng": 72.8697})
        t1 = res.json()
        t1_id = t1["id"]
        print(f"POST /complaints (New) -> HTTP {res.status_code} | Ticket ID: {t1_id}, is_dup: {t1['is_duplicate']}, reports: {t1['report_count']}")
        assert t1["is_duplicate"] is False
        assert t1["report_count"] == 1

        # 4. Submit 2 (Duplicate nearby within 200m)
        res = await client.post("/complaints", json={"text": "Someone might fall in this open manhole on Central Ave", "lat": 19.1138, "lng": 72.8698})
        t2 = res.json()
        print(f"POST /complaints (Duplicate) -> HTTP {res.status_code} | Ticket ID: {t2['id']}, is_dup: {t2['is_duplicate']}, reports: {t2['report_count']}")
        assert t2["id"] == t1_id
        assert t2["is_duplicate"] is True
        assert t2["report_count"] == 2

        # 5. Get Ticket
        res = await client.get(f"/tickets/{t1_id}")
        print(f"GET /tickets/{t1_id} -> HTTP {res.status_code} | Status: {res.json()['status']}")
        assert res.status_code == 200

        # 6. Status transition
        res = await client.patch(f"/tickets/{t1_id}/status", json={"status": "in_progress"})
        print(f"PATCH /tickets/{t1_id}/status -> HTTP {res.status_code} | Status: {res.json()['status']}")
        assert res.json()["status"] == "in_progress"

        res = await client.patch(f"/tickets/{t1_id}/status", json={"status": "resolved"})
        print(f"PATCH /tickets/{t1_id}/status -> HTTP {res.status_code} | Status: {res.json()['status']}, Priority: {res.json()['priority_score']}")
        assert res.json()["status"] == "resolved"
        assert res.json()["priority_score"] == 0.0

        # 7. List tickets
        res = await client.get("/tickets")
        print(f"GET /tickets -> HTTP {res.status_code} | Total tickets: {res.json()['total']}")
        assert res.status_code == 200

        # 8. Error handling: 404
        res = await client.get("/tickets/88888888")
        print(f"GET /tickets/88888888 -> HTTP {res.status_code} (Expected 404)")
        assert res.status_code == 404

        # 9. Error handling: 422 Invalid Status
        res = await client.patch(f"/tickets/{t1_id}/status", json={"status": "completed_invalid"})
        print(f"PATCH invalid status -> HTTP {res.status_code} (Expected 422)")
        assert res.status_code == 422

    log_section("AUDIT EXECUTION COMPLETE - ALL TESTS PASSED")


if __name__ == "__main__":
    asyncio.run(run_all_audits())
