import io
import os
import logging
from groq import AsyncGroq
from app.config import settings

logger = logging.getLogger(__name__)


def get_client() -> AsyncGroq:
    api_key = settings.GROQ_API_KEY or os.getenv("GROQ_API_KEY", "")
    return AsyncGroq(api_key=api_key)


async def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    """
    Transcribe audio using Groq's Whisper API.
    Accepts raw audio bytes (webm/mp4/wav/ogg) and returns transcribed text.
    """
    audio_file = (filename, io.BytesIO(audio_bytes), "audio/webm")
    client = get_client()

    try:
        transcription = await client.audio.transcriptions.create(
            file=audio_file,
            model="whisper-large-v3",
            response_format="text",
            language="en",
        )
    except Exception as e:
        logger.error(f"Groq Whisper transcription failed: {e}")
        raise RuntimeError(f"Voice transcription failed: {e}") from e

    # Groq returns a Transcription object when response_format="text";
    # extract the text content safely.
    if isinstance(transcription, str):
        return transcription.strip()
    # Some SDK versions return an object with a .text attribute
    return getattr(transcription, "text", str(transcription)).strip()
