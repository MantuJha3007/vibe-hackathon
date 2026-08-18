import json
import re
import logging
# pyrefly: ignore [missing-import]
from groq import AsyncGroq
from app.config import settings
from app.schemas.complaint import ComplaintAnalysis, ComplaintInput, LocationInfo

logger = logging.getLogger(__name__)

client = AsyncGroq(api_key=settings.GROQ_API_KEY)

SYSTEM_PROMPT = """You are an AI assistant for a civic complaint management system.
Analyze the citizen's complaint and extract structured information.

Respond ONLY with a valid JSON object in this exact format:
{
  "category": "<one of: Pothole, Garbage, Streetlight, Water Supply, Sewage, Noise Pollution, Air Pollution, Road Damage, Tree Hazard, Illegal Construction, Industrial Waste, Other>",
  "severity": <integer 1-5, where 1=minor inconvenience, 3=significant issue, 5=emergency/health hazard>,
  "department": "<responsible government department>",
  "location": {
    "lat": <latitude as float, use 0.0 if unknown>,
    "lng": <longitude as float, use 0.0 if unknown>,
    "address": "<extracted address or landmark, empty string if none>"
  },
  "summary": "<one concise sentence summarizing the complaint>",
  "keywords": ["<tag1>", "<tag2>", "<tag3>"]
}

Severity guide:
1 = Minor aesthetic issue (graffiti, overgrown grass)
2 = Inconvenience (small pothole, dim streetlight)
3 = Significant issue (large pothole, frequent power cuts)
4 = Safety hazard (broken manhole, fallen tree blocking road)
5 = Emergency / health hazard (sewage overflow, toxic discharge, structural collapse risk)
"""


async def analyze_complaint(complaint: ComplaintInput) -> ComplaintAnalysis:
    """Send complaint text to Groq and parse structured JSON response."""
    user_content = complaint.text
    if complaint.lat and complaint.lng:
        user_content += f"\n[GPS: {complaint.lat}, {complaint.lng}]"

    models_to_try = [
        getattr(settings, "GROQ_MODEL", "groq/compound-mini"),
        "groq/compound-mini",
        "groq/compound",
        "llama-3.3-70b-versatile",
        "allam-2-7b",
    ]
    # Remove duplicate order-preserved entries
    models_to_try = list(dict.fromkeys(models_to_try))

    response = None
    last_err = None
    for model_name in models_to_try:
        try:
            response = await client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_content},
                ],
                temperature=0.1,
                max_tokens=512,
            )
            if response and response.choices and response.choices[0].message.content:
                break
        except Exception as e:
            last_err = e
            logger.warning(f"Groq model {model_name} failed: {e}. Trying fallback...")

    if not response or not response.choices:
        logger.error(f"All Groq model attempts failed. Last error: {last_err}")
        raise RuntimeError(f"LLM service unavailable: {last_err}")

    raw = response.choices[0].message.content.strip()

    # Extract JSON block if wrapped in markdown code fences
    json_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
    json_str = json_match.group(1) if json_match else raw

    try:
        data = json.loads(json_str)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse LLM response as JSON: {raw}")
        raise RuntimeError(f"LLM returned invalid JSON: {e}") from e

    # Clamp severity to valid range
    severity = max(1, min(5, int(data.get("severity", 3))))

    # If complaint had explicit GPS, override LLM location
    location_data = data.get("location", {"lat": 0.0, "lng": 0.0, "address": ""})
    if complaint.lat and complaint.lng:
        location_data["lat"] = complaint.lat
        location_data["lng"] = complaint.lng

    return ComplaintAnalysis(
        category=data.get("category", "Other"),
        severity=severity,
        department=data.get("department", "Municipal Corporation"),
        location=LocationInfo(**location_data),
        summary=data.get("summary", complaint.text[:100]),
        keywords=data.get("keywords", []),
    )
