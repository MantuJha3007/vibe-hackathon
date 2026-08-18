# pyrefly: ignore [missing-import]
import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
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

router = APIRouter(prefix="/complaints", tags=["complaints"])


@router.post("/analyze", response_model=ComplaintAnalysis)
async def analyze_only(complaint: ComplaintInput):
    """
    Analyze complaint text with Groq LLM and return structured JSON.
    Does NOT save to DB — use POST /complaints for full submit flow.
    """
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
    1. Analyze text with Groq
    2. Check dedup (200m radius, same category)
    3. Create new ticket OR increment existing
    4. Return ticket
    """
    analysis = await analyze_complaint(complaint)
    ticket, is_duplicate = await find_or_create_ticket(db, analysis, original_text=complaint.text)
    data = TicketResponse.model_validate(ticket).model_dump()
    data["is_duplicate"] = is_duplicate
    return TicketResponse(**data)


@router.post("/voice", response_model=TicketResponse)
async def submit_voice_complaint(
    audio: UploadFile = File(...),
    lat: Optional[float] = Form(None),
    lng: Optional[float] = Form(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Voice complaint flow:
    1. Transcribe audio via Groq Whisper
    2. Feed transcription through normal complaint pipeline
    """
    audio_bytes = await audio.read()
    text = await transcribe_audio(audio_bytes, filename=audio.filename or "audio.webm")
    complaint = ComplaintInput(text=text, lat=lat, lng=lng)
    analysis = await analyze_complaint(complaint)
    ticket, is_duplicate = await find_or_create_ticket(db, analysis, original_text=text)
    data = TicketResponse.model_validate(ticket).model_dump()
    data["is_duplicate"] = is_duplicate
    return TicketResponse(**data)
