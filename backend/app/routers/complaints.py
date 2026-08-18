from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.schemas.complaint import ComplaintInput, ComplaintAnalysis
from app.schemas.ticket import TicketResponse
from app.services.llm_service import analyze_complaint
from app.services.stt_service import transcribe_audio
from app.services.dedup_service import find_or_create_ticket

router = APIRouter(prefix="/complaints", tags=["complaints"])


@router.post("/analyze", response_model=ComplaintAnalysis)
async def analyze_only(complaint: ComplaintInput):
    """
    Analyze complaint text with Groq LLM and return structured JSON.
    Does NOT save to DB — use POST /complaints for full submit flow.
    """
    return await analyze_complaint(complaint)


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
