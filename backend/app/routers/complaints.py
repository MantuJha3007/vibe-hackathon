# pyrefly: ignore [missing-import]
import os
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.schemas.complaint import ComplaintInput, ComplaintAnalysis
from app.schemas.ticket import TicketResponse
from app.services.llm_service import analyze_complaint
from app.services.stt_service import transcribe_audio
from app.services.dedup_service import find_or_create_ticket
from app.services.vision_service import analyze_image_with_yolo
from app.services.geocoding_service import reverse_geocode

router = APIRouter(prefix="/complaints", tags=["complaints"])


@router.get("/location/reverse-geocode")
async def get_reverse_geocode(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude (-90 to 90)"),
    lng: float = Query(..., ge=-180.0, le=180.0, description="Longitude (-180 to 180)"),
):
    """
    Convert authoritative GPS or manual coordinates into a human-readable street address.
    """
    result = await reverse_geocode(lat, lng)
    return result


@router.post("/analyze", response_model=ComplaintAnalysis)
async def analyze_only(complaint: ComplaintInput):
    """
    Analyze complaint text with Groq LLM and return structured JSON.
    Does NOT save to DB — use POST /complaints for full submit flow.
    """
    # Validate coordinate ranges if provided
    if complaint.lat is not None and (complaint.lat < -90.0 or complaint.lat > 90.0):
        raise HTTPException(status_code=400, detail="Invalid latitude. Must be between -90 and 90.")
    if complaint.lng is not None and (complaint.lng < -180.0 or complaint.lng > 180.0):
        raise HTTPException(status_code=400, detail="Invalid longitude. Must be between -180 and 180.")
    if complaint.location_accuracy is not None and complaint.location_accuracy < 0:
        raise HTTPException(status_code=400, detail="Accuracy cannot be negative.")

    return await analyze_complaint(complaint)


@router.post("/transcribe")
async def transcribe_only(
    audio: UploadFile = File(...),
):
    """
    Transcribe audio recording via Groq Whisper and return raw text.
    Does NOT submit complaint or save to DB.
    """
    try:
        audio_bytes = await audio.read()
        if not audio_bytes or len(audio_bytes) < 100:
            raise HTTPException(status_code=400, detail="Recording is too short or empty. Please record again.")
        text = await transcribe_audio(audio_bytes, filename=audio.filename or "audio.webm")
        if not text or len(text.strip()) == 0:
            raise HTTPException(status_code=422, detail="No speech could be recognized. Please speak clearly and try again.")
        return {"text": text}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Voice transcription failed: {str(e)}")


@router.post("/image/analyze")
async def analyze_image_complaint(
    image: UploadFile = File(...),
):
    """
    Analyze uploaded incident photo using YOLOv8 computer vision model.
    Returns detected objects, confidence scores, bounding boxes, and an annotated image.
    """
    allowed_extensions = {".jpg", ".jpeg", ".png", ".webp"}
    filename = (image.filename or "").lower()
    ext = os.path.splitext(filename)[1]
    if ext and ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Unsupported image format. Please upload a JPG, PNG, or WEBP photo.")

    try:
        image_bytes = await image.read()
        if not image_bytes or len(image_bytes) < 100:
            raise HTTPException(status_code=400, detail="Empty image file received.")
        if len(image_bytes) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Image size exceeds 10MB limit.")

        result = analyze_image_with_yolo(image_bytes)
        return result
    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image inspection failed: {str(e)}")


@router.post("", response_model=TicketResponse)
async def submit_complaint(
    complaint: ComplaintInput,
    db: AsyncSession = Depends(get_db),
):
    """
    Full complaint flow:
    1. Validate coordinates & Reverse geocode if coordinates exist
    2. Analyze text with Groq LLM
    3. Check dedup (200m radius, same category)
    4. Create new ticket OR increment existing
    5. Return ticket with distance and location metadata
    """
    if complaint.lat is not None and (complaint.lat < -90.0 or complaint.lat > 90.0):
        raise HTTPException(status_code=400, detail="Invalid latitude. Must be between -90 and 90.")
    if complaint.lng is not None and (complaint.lng < -180.0 or complaint.lng > 180.0):
        raise HTTPException(status_code=400, detail="Invalid longitude. Must be between -180 and 180.")

    # Authoritative reverse geocoding if address not supplied
    if complaint.lat is not None and complaint.lng is not None and not complaint.address:
        geo = await reverse_geocode(complaint.lat, complaint.lng)
        complaint.address = geo.get("address", "")

    analysis = await analyze_complaint(complaint)
    ticket, is_duplicate, distance_m = await find_or_create_ticket(db, analysis, original_text=complaint.text)
    
    data = TicketResponse.model_validate(ticket).model_dump()
    data["is_duplicate"] = is_duplicate
    data["duplicate_distance_meters"] = distance_m if is_duplicate else None
    return TicketResponse(**data)


@router.post("/voice", response_model=TicketResponse)
async def submit_voice_complaint(
    audio: UploadFile = File(...),
    lat: Optional[float] = Form(None),
    lng: Optional[float] = Form(None),
    address: Optional[str] = Form(None),
    location_accuracy: Optional[float] = Form(None),
    location_source: Optional[str] = Form("gps"),
    db: AsyncSession = Depends(get_db),
):
    """
    Voice complaint flow (legacy backward-compatible endpoint)
    """
    audio_bytes = await audio.read()
    text = await transcribe_audio(audio_bytes, filename=audio.filename or "audio.webm")
    
    if lat is not None and lng is not None and not address:
        geo = await reverse_geocode(lat, lng)
        address = geo.get("address", "")

    complaint = ComplaintInput(
        text=text,
        lat=lat,
        lng=lng,
        address=address,
        location_accuracy=location_accuracy,
        location_source=location_source,
    )
    analysis = await analyze_complaint(complaint)
    ticket, is_duplicate, distance_m = await find_or_create_ticket(db, analysis, original_text=text)
    
    data = TicketResponse.model_validate(ticket).model_dump()
    data["is_duplicate"] = is_duplicate
    data["duplicate_distance_meters"] = distance_m if is_duplicate else None
    return TicketResponse(**data)

