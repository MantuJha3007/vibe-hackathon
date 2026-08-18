from datetime import datetime, timezone
from sqlalchemy import String, Integer, Float, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def _now():
    return datetime.now(timezone.utc)


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    category: Mapped[str] = mapped_column(String(64), index=True)
    severity: Mapped[int] = mapped_column(Integer)
    department: Mapped[str] = mapped_column(String(128))
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    address: Mapped[str] = mapped_column(String(256), default="")
    summary: Mapped[str] = mapped_column(String(512))
    keywords: Mapped[list] = mapped_column(JSON, default=list)
    original_text: Mapped[str] = mapped_column(String(2048), default="")
    geohash: Mapped[str] = mapped_column(String(16), index=True, default="")

    status: Mapped[str] = mapped_column(String(20), default="new", index=True)
    report_count: Mapped[int] = mapped_column(Integer, default=1)
    priority_score: Mapped[float] = mapped_column(Float, default=0.0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)
