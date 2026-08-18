# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException
# pyrefly: ignore [missing-import]
from sqlalchemy import select, func
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.models.ticket import Ticket
from app.schemas.ticket import TicketResponse, TicketStatusUpdate, TicketListResponse
from app.services.priority_service import compute_priority_score

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.get("", response_model=TicketListResponse)
async def list_tickets(
    status: Optional[str] = None,
    department: Optional[str] = None,
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """List all tickets, sorted by priority score descending."""
    stmt = select(Ticket).order_by(Ticket.priority_score.desc())
    if status:
        stmt = stmt.where(Ticket.status == status)
    if department:
        stmt = stmt.where(Ticket.department == department)
    if category:
        stmt = stmt.where(Ticket.category == category)

    result = await db.execute(stmt)
    tickets = result.scalars().all()

    return TicketListResponse(
        tickets=[TicketResponse.model_validate(t) for t in tickets],
        total=len(tickets),
    )


@router.get("/{ticket_id}", response_model=TicketResponse)
async def get_ticket(ticket_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single ticket by ID (used for citizen status tracking)."""
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")
    return TicketResponse.model_validate(ticket)


@router.patch("/{ticket_id}/status", response_model=TicketResponse)
async def update_ticket_status(
    ticket_id: int,
    update: TicketStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Admin endpoint — update ticket status (new → in_progress → resolved)."""
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")

    ticket.status = update.status
    # Resolved tickets drop to zero priority
    if update.status == "resolved":
        ticket.priority_score = 0.0
    await db.commit()
    await db.refresh(ticket)
    return TicketResponse.model_validate(ticket)
