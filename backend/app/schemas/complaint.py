from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class LocationInfo(BaseModel):
    lat: float = Field(default=0.0, description="Latitude")
    lng: float = Field(default=0.0, description="Longitude")
    address: str = Field(default="", description="Human-readable address")
    accuracy: Optional[float] = Field(default=None, description="GPS accuracy in meters")
    source: Optional[str] = Field(default="gps", description="gps, gps_adjusted, or manual")
    timestamp: Optional[datetime] = Field(default=None, description="Location capture timestamp")


class ComplaintInput(BaseModel):
    text: str = Field(..., description="Raw complaint text from citizen")
    lat: Optional[float] = Field(None, ge=-90.0, le=90.0, description="GPS latitude (-90 to 90)")
    lng: Optional[float] = Field(None, ge=-180.0, le=180.0, description="GPS longitude (-180 to 180)")
    address: Optional[str] = Field(None, description="Human-readable address or landmark")
    location_accuracy: Optional[float] = Field(None, ge=0.0, description="Estimated accuracy in meters")
    location_source: Optional[str] = Field("gps", description="Location source: gps, gps_adjusted, or manual")
    location_timestamp: Optional[datetime] = Field(None, description="When coordinates were captured")


class ComplaintAnalysis(BaseModel):
    category: str = Field(..., description="Issue category e.g. Pothole, Garbage, Streetlight")
    severity: int = Field(..., ge=1, le=5, description="Severity 1 (minor) to 5 (critical)")
    department: str = Field(..., description="Responsible government department")
    location: LocationInfo
    summary: str = Field(..., description="One-sentence summary of the complaint")
    keywords: list[str] = Field(default_factory=list, description="Key tags for the issue")

