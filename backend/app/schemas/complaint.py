from pydantic import BaseModel, Field
from typing import Optional


class LocationInfo(BaseModel):
    lat: float = Field(default=0.0, description="Latitude")
    lng: float = Field(default=0.0, description="Longitude")
    address: str = Field(default="", description="Human-readable address")


class ComplaintInput(BaseModel):
    text: str = Field(..., description="Raw complaint text from citizen")
    lat: Optional[float] = Field(None, description="Optional GPS latitude")
    lng: Optional[float] = Field(None, description="Optional GPS longitude")


class ComplaintAnalysis(BaseModel):
    category: str = Field(..., description="Issue category e.g. Pothole, Garbage, Streetlight")
    severity: int = Field(..., ge=1, le=5, description="Severity 1 (minor) to 5 (critical)")
    department: str = Field(..., description="Responsible government department")
    location: LocationInfo
    summary: str = Field(..., description="One-sentence summary of the complaint")
    keywords: list[str] = Field(default_factory=list, description="Key tags for the issue")
