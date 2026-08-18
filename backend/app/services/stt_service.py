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
    ext = os.path.splitext(filename)[1].lower().lstrip(".")
    mime_map = {
        "wav": "audio/wav",
        "webm": "audio/webm",
        "mp4": "audio/mp4",
        "m4a": "audio/m4a",
        "ogg": "audio/ogg",
        "mp3": "audio/mpeg",
    }
    content_type = mime_map.get(ext, "audio/webm")
    audio_file = (filename, audio_bytes, content_type)
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

    # Groq returns a string when response_format="text" or Transcription object
    if isinstance(transcription, str):
        return transcription.strip()
    return getattr(transcription, "text", str(transcription)).strip()

