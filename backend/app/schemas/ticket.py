from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class TicketCreate(BaseModel):
    category: str
    severity: int
    department: str
    lat: float
    lng: float
    address: str
    summary: str
    keywords: list[str] = []
    original_text: str = ""


class TicketResponse(BaseModel):
    id: int
    category: str
    severity: int
    department: str
    lat: float
    lng: float
    address: str
    summary: str
    keywords: list[str]
    status: str
    report_count: int
    priority_score: float
    original_text: str
    created_at: datetime
    updated_at: datetime
    is_duplicate: bool = False

    class Config:
        from_attributes = True


class TicketStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(new|in_progress|resolved)$")


class TicketListResponse(BaseModel):
    tickets: list[TicketResponse]
    total: int
