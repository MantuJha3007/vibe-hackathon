import logging
from typing import Optional
import httpx

logger = logging.getLogger(__name__)

# Simple in-memory cache to avoid duplicate OSM lookups and respect rate limits
_GEOCODE_CACHE = {}


def _round_key(lat: float, lng: float) -> str:
    """Hash key within ~10m resolution"""
    return f"{round(lat, 4)},{round(lng, 4)}"


async def reverse_geocode(lat: float, lng: float) -> dict:
    """
    Reverse geocode latitude and longitude to a human-readable street address.
    Uses OpenStreetMap Nominatim with in-memory caching and resilient fallback.
    """
    if lat is None or lng is None:
        return {"address": "", "city": "", "state": "", "country": "", "postcode": ""}

    # Validate coordinate ranges
    if not (-90.0 <= lat <= 90.0) or not (-180.0 <= lng <= 180.0):
        logger.warning(f"Invalid coordinates passed to reverse geocode: {lat}, {lng}")
        return {
            "address": f"Invalid coordinates ({lat}, {lng})",
            "city": "",
            "state": "",
            "country": "",
            "postcode": "",
        }

    key = _round_key(lat, lng)
    if key in _GEOCODE_CACHE:
        return _GEOCODE_CACHE[key]

    url = "https://nominatim.openstreetmap.org/reverse"
    params = {
        "format": "jsonv2",
        "lat": lat,
        "lon": lng,
        "addressdetails": 1,
        "zoom": 18,
    }
    headers = {
        "User-Agent": "SentinelCivicOperations/1.0 (sentinel-civic-intelligence@sentinel.local)"
    }

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            res = await client.get(url, params=params, headers=headers)
            if res.status_code == 200:
                data = res.json()
                addr_details = data.get("address", {})

                # Build a concise, clean address
                components = []
                road = addr_details.get("road") or addr_details.get("pedestrian") or addr_details.get("street")
                suburb = addr_details.get("suburb") or addr_details.get("neighbourhood") or addr_details.get("residential")
                city = addr_details.get("city") or addr_details.get("town") or addr_details.get("municipality") or addr_details.get("county")
                state = addr_details.get("state")
                country = addr_details.get("country", "")
                postcode = addr_details.get("postcode", "")

                if road:
                    components.append(road)
                if suburb:
                    components.append(suburb)
                if city:
                    components.append(city)
                if state and state != city:
                    components.append(state)

                formatted_address = ", ".join(components) if components else data.get("display_name", "")
                
                # If still empty, use display_name truncated
                if not formatted_address:
                    formatted_address = data.get("display_name", f"{lat:.4f}° N, {lng:.4f}° E")

                result = {
                    "address": formatted_address,
                    "city": city or "",
                    "state": state or "",
                    "country": country or "",
                    "postcode": postcode or "",
                    "display_name": data.get("display_name", formatted_address),
                }
                _GEOCODE_CACHE[key] = result
                return result
            else:
                logger.warning(f"Nominatim reverse geocode returned status {res.status_code}")
    except Exception as e:
        logger.warning(f"Reverse geocode lookup failed ({e}), using coordinate fallback.")

    # Graceful fallback without failing ticket workflow
    fallback = {
        "address": f"Near {lat:.4f}° N, {lng:.4f}° E",
        "city": "",
        "state": "",
        "country": "",
        "postcode": "",
        "display_name": f"{lat:.4f}, {lng:.4f}",
    }
    _GEOCODE_CACHE[key] = fallback
    return fallback
