import pygeohash as gh
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ticket import Ticket
from app.schemas.complaint import ComplaintAnalysis
from app.utils.geo import haversine
from app.services.priority_service import compute_priority_score

DEDUP_RADIUS_M = 200  # metres
GEOHASH_PRECISION = 5  # ~5km cell — broad first pass


def _encode(lat: float, lng: float) -> str:
    """Encode lat/lng to geohash at fixed precision."""
    return gh.encode(lat, lng, precision=GEOHASH_PRECISION)


def _expand(geohash_str: str) -> list[str]:
    """Return the geohash itself plus all 8 neighbouring cells."""
    if not geohash_str:
        return []
    try:
        lat, lon, lat_err, lon_err = gh.decode_exactly(geohash_str)
        precision = len(geohash_str)
        
        offsets = [
            (0, 0),
            (2 * lat_err, 0),
            (-2 * lat_err, 0),
            (0, 2 * lon_err),
            (0, -2 * lon_err),
            (2 * lat_err, 2 * lon_err),
            (2 * lat_err, -2 * lon_err),
            (-2 * lat_err, 2 * lon_err),
            (-2 * lat_err, -2 * lon_err),
        ]
        
        cells = set()
        for dlat, dlon in offsets:
            n_lat = min(90.0, max(-90.0, lat + dlat))
            n_lon = ((lon + dlon + 180.0) % 360.0) - 180.0
            cells.add(gh.encode(n_lat, n_lon, precision=precision))
        return list(cells)
    except Exception:
        return [geohash_str]


async def find_or_create_ticket(
    db: AsyncSession,
    analysis: ComplaintAnalysis,
    original_text: str = "",
) -> tuple[Ticket, bool, float]:
    """
    Attempt to find a near-duplicate open ticket within DEDUP_RADIUS_M (200m).
    Returns (ticket, is_duplicate, distance_meters).
    """
    lat, lng = analysis.location.lat, analysis.location.lng
    incoming_hash = _encode(lat, lng)
    search_hashes = _expand(incoming_hash)

    stmt = select(Ticket).where(
        Ticket.status != "resolved",
        Ticket.category == analysis.category,
        Ticket.geohash.in_(search_hashes),
    )
    result = await db.execute(stmt)
    candidates = result.scalars().all()

    for ticket in candidates:
        dist = haversine(lat, lng, ticket.lat, ticket.lng)
        if dist <= DEDUP_RADIUS_M:
            ticket.report_count += 1
            ticket.priority_score = compute_priority_score(ticket.severity, ticket.report_count)
            await db.commit()
            await db.refresh(ticket)
            return ticket, True, round(dist, 1)

    # No duplicate — create fresh ticket
    score = compute_priority_score(analysis.severity, 1)
    new_ticket = Ticket(
        category=analysis.category,
        severity=analysis.severity,
        department=analysis.department,
        lat=lat,
        lng=lng,
        address=analysis.location.address,
        summary=analysis.summary,
        keywords=analysis.keywords,
        original_text=original_text,
        geohash=incoming_hash,
        location_accuracy=analysis.location.accuracy,
        location_source=analysis.location.source or "gps",
        location_timestamp=analysis.location.timestamp,
        status="new",
        report_count=1,
        priority_score=score,
    )
    db.add(new_ticket)
    await db.commit()
    await db.refresh(new_ticket)
    return new_ticket, False, 0.0

