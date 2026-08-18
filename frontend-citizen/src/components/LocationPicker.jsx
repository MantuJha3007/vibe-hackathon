import { useState, useEffect, useRef } from "react";
import { reverseGeocode } from "../api/client";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Custom Leaflet pin icon for Citizen reporting
const pinIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Map click & drag event handler
function DraggableMapPin({ position, onPositionChange }) {
  useMapEvents({
    click(e) {
      onPositionChange(e.latlng.lat, e.latlng.lng);
    },
  });

  return (
    <Marker
      position={position}
      icon={pinIcon}
      draggable={true}
      eventHandlers={{
        dragend(e) {
          const marker = e.target;
          const pos = marker.getLatLng();
          onPositionChange(pos.lat, pos.lng);
        },
      }}
    />
  );
}

export default function LocationPicker({ value, onChange, disabled }) {
  // value: { lat, lng, address, accuracy, source, timestamp }
  const [status, setStatus] = useState(value?.lat ? "captured" : "idle"); // 'idle' | 'acquiring' | 'captured' | 'low_accuracy' | 'denied' | 'error'
  const [errorMsg, setErrorMsg] = useState("");
  const [showMapModal, setShowMapModal] = useState(false);
  const [tempCoords, setTempCoords] = useState(value ? [value.lat, value.lng] : [19.076, 72.877]);
  const [tempAddress, setTempAddress] = useState(value?.address || "");
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Sync incoming value
  useEffect(() => {
    if (value?.lat && value?.lng) {
      setTempCoords([value.lat, value.lng]);
      setTempAddress(value.address || "");
      if (value.accuracy && value.accuracy > 100) {
        setStatus("low_accuracy");
      } else {
        setStatus("captured");
      }
    }
  }, [value]);

  // Format timestamp
  function formatTimestamp(ts) {
    if (!ts) return "Just now";
    const d = new Date(ts);
    return isNaN(d.getTime()) ? "Just now" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  // Format coordinates cleanly (e.g. 19.123456° N, 72.912345° E)
  function formatCoordinates(lat, lng) {
    if (lat === undefined || lng === undefined) return "";
    const latDir = lat >= 0 ? "N" : "S";
    const lngDir = lng >= 0 ? "E" : "W";
    return `${Math.abs(lat).toFixed(6)}° ${latDir}, ${Math.abs(lng).toFixed(6)}° ${lngDir}`;
  }

  // Authoritative GPS position acquisition with high accuracy
  async function acquireGps(retryCount = 0) {
    if (!navigator.geolocation) {
      setStatus("error");
      setErrorMsg("Geolocation is not supported by your browser.");
      return;
    }

    setStatus("acquiring");
    setErrorMsg("");

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy);
        const timestamp = new Date(pos.timestamp || Date.now()).toISOString();

        // Perform reverse geocoding via backend
        let address = "";
        try {
          const geo = await reverseGeocode(lat, lng);
          address = geo.address || "";
        } catch {
          address = `Near ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`;
        }

        const locData = {
          lat,
          lng,
          address,
          accuracy,
          source: "gps",
          timestamp,
        };

        onChange(locData);
        setTempCoords([lat, lng]);
        setTempAddress(address);

        if (accuracy > 100) {
          setStatus("low_accuracy");
        } else {
          setStatus("captured");
        }
      },
      (err) => {
        console.warn("GPS error:", err);
        if (err.code === 1) {
          // PERMISSION_DENIED
          setStatus("denied");
          setErrorMsg("Location permission is required to accurately place this complaint.");
        } else if (err.code === 2) {
          // POSITION_UNAVAILABLE
          setStatus("error");
          setErrorMsg("We couldn't determine your current location. Move outdoors or choose on map.");
        } else {
          // TIMEOUT
          if (retryCount < 1) {
            // Attempt one retry
            acquireGps(retryCount + 1);
            return;
          }
          setStatus("error");
          setErrorMsg("Location request timed out. Please try again or select on map.");
        }
      },
      options
    );
  }

  // Handle map pin movement in modal
  async function handleMapPinChange(newLat, newLng) {
    setTempCoords([newLat, newLng]);
    setIsGeocoding(true);
    try {
      const geo = await reverseGeocode(newLat, newLng);
      setTempAddress(geo.address || `Selected Location (${newLat.toFixed(4)}, ${newLng.toFixed(4)})`);
    } catch {
      setTempAddress(`Selected Location (${newLat.toFixed(4)}, ${newLng.toFixed(4)})`);
    } finally {
      setIsGeocoding(false);
    }
  }

  // Confirm manual/adjusted position from map modal
  function handleConfirmMapLocation() {
    const isAdjusted = value?.lat && Math.abs(value.lat - tempCoords[0]) > 0.0001;
    const locData = {
      lat: tempCoords[0],
      lng: tempCoords[1],
      address: tempAddress || `Location (${tempCoords[0].toFixed(4)}, ${tempCoords[1].toFixed(4)})`,
      accuracy: isAdjusted ? 5 : (value?.accuracy || 10),
      source: isAdjusted ? "gps_adjusted" : "manual",
      timestamp: new Date().toISOString(),
    };
    onChange(locData);
    setStatus("captured");
    setShowMapModal(false);
  }

  return (
    <div className="location-picker-card">
      {/* 1. IDLE STATE: No location captured yet */}
      {status === "idle" && (
        <div className="location-idle-box">
          <div className="location-idle-header">
            <span className="location-idle-icon">📍</span>
            <div>
              <div className="location-idle-title">Your complaint location</div>
              <div className="location-idle-subtitle">
                Location will be captured automatically to route this incident accurately.
              </div>
            </div>
          </div>
          <div className="location-idle-actions">
            <button
              type="button"
              className="btn-use-location"
              onClick={() => acquireGps(0)}
              disabled={disabled}
              id="btn-use-location"
            >
              📍 Use My Current Location
            </button>
            <button
              type="button"
              className="btn-choose-map"
              onClick={() => setShowMapModal(true)}
              disabled={disabled}
              id="btn-open-map"
            >
              🗺️ Choose on Map
            </button>
          </div>
        </div>
      )}

      {/* 2. ACQUIRING GPS STATE */}
      {status === "acquiring" && (
        <div className="location-acquiring-box">
          <div className="location-spinner" />
          <div className="location-acquiring-title">Getting your precise location...</div>
          <div className="location-acquiring-sub">
            Querying device GPS with high accuracy
          </div>
        </div>
      )}

      {/* 3. CAPTURED / HIGH ACCURACY STATE */}
      {status === "captured" && value?.lat && (
        <div className="location-captured-box">
          <div className="captured-header">
            <div className="captured-status-badge">
              <span className="captured-status-dot" />
              <span>Location Captured</span>
            </div>
            <div className="captured-source-badge">
              {value.source === "gps_adjusted" ? "GPS Adjusted" : value.source === "manual" ? "Manual Pin" : "Device GPS"}
            </div>
          </div>

          <div className="captured-details-card">
            <div className="captured-address-row">
              <span className="captured-pin-icon">📍</span>
              <div className="captured-address-text">{value.address || "Address detected from coordinates"}</div>
            </div>

            <div className="captured-meta-grid">
              <div className="captured-meta-item">
                <span className="meta-label">Coordinates</span>
                <span className="meta-value">{formatCoordinates(value.lat, value.lng)}</span>
              </div>
              <div className="captured-meta-item">
                <span className="meta-label">Estimated Accuracy</span>
                <span className={`meta-value ${value.accuracy && value.accuracy <= 20 ? "acc-good" : "acc-fair"}`}>
                  ±{value.accuracy || 8} m
                </span>
              </div>
              <div className="captured-meta-item">
                <span className="meta-label">Captured</span>
                <span className="meta-value">{formatTimestamp(value.timestamp)}</span>
              </div>
            </div>

            {/* Small Static / Interactive Map Preview */}
            <div className="captured-map-preview">
              <MapContainer
                center={[value.lat, value.lng]}
                zoom={16}
                scrollWheelZoom={false}
                dragging={false}
                zoomControl={false}
                attributionControl={false}
                style={{ height: "130px", width: "100%", borderRadius: "6px" }}
              >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                <Marker position={[value.lat, value.lng]} icon={pinIcon} />
              </MapContainer>
            </div>
          </div>

          <div className="captured-actions-row">
            <button
              type="button"
              className="btn-loc-adjust"
              onClick={() => {
                setTempCoords([value.lat, value.lng]);
                setTempAddress(value.address || "");
                setShowMapModal(true);
              }}
              id="btn-adjust-location"
            >
              ✏️ Adjust on Map
            </button>
            <button
              type="button"
              className="btn-loc-refresh"
              onClick={() => acquireGps(0)}
              id="btn-refresh-location"
            >
              🔄 Refresh GPS
            </button>
          </div>
        </div>
      )}

      {/* 4. LOW ACCURACY WARNING STATE */}
      {status === "low_accuracy" && value?.lat && (
        <div className="location-warning-box">
          <div className="warning-banner-header">
            <span>⚠️ Location captured with low accuracy (±{value.accuracy} m)</span>
          </div>
          <p className="warning-desc">
            Your location accuracy is low. Move outdoors or choose the exact spot on the map for best department response.
          </p>

          <div className="captured-address-row">
            <span className="captured-pin-icon">📍</span>
            <div className="captured-address-text">{value.address || formatCoordinates(value.lat, value.lng)}</div>
          </div>

          <div className="warning-actions-row">
            <button
              type="button"
              className="btn-improve-acc"
              onClick={() => acquireGps(0)}
              id="btn-improve-accuracy"
            >
              🎯 Improve Accuracy
            </button>
            <button
              type="button"
              className="btn-adjust-map-warn"
              onClick={() => setShowMapModal(true)}
              id="btn-adjust-map-warn"
            >
              🗺️ Adjust on Map
            </button>
          </div>
        </div>
      )}

      {/* 5. PERMISSION DENIED STATE */}
      {status === "denied" && (
        <div className="location-error-box">
          <div className="error-title-row">
            <span>🚫 {errorMsg}</span>
          </div>
          <p className="error-desc">
            Browser location access is blocked. You can grant permission in your browser bar or pick the location manually.
          </p>
          <div className="error-actions-row">
            <button
              type="button"
              className="btn-loc-retry"
              onClick={() => acquireGps(0)}
            >
              Try Again
            </button>
            <button
              type="button"
              className="btn-choose-map"
              onClick={() => setShowMapModal(true)}
            >
              Choose Location on Map
            </button>
          </div>
        </div>
      )}

      {/* 6. GENERAL GPS ERROR STATE */}
      {status === "error" && (
        <div className="location-error-box">
          <div className="error-title-row">
            <span>⚠️ {errorMsg}</span>
          </div>
          <div className="error-actions-row">
            <button
              type="button"
              className="btn-loc-retry"
              onClick={() => acquireGps(0)}
            >
              Try Again
            </button>
            <button
              type="button"
              className="btn-choose-map"
              onClick={() => setShowMapModal(true)}
            >
              Choose Location on Map
            </button>
          </div>
        </div>
      )}

      {/* ─── MAP PIN ADJUSTMENT MODAL ──────────────────────────── */}
      {showMapModal && (
        <div className="map-modal-backdrop" onClick={() => setShowMapModal(false)}>
          <div className="map-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="map-modal-header">
              <div>
                <div className="map-modal-title">Select Exact Incident Location</div>
                <div className="map-modal-sub">
                  Drag the pin or click anywhere on the map to pinpoint the problem location.
                </div>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setShowMapModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="map-modal-body">
              <div className="modal-map-wrapper" style={{ height: "340px", width: "100%" }}>
                <MapContainer
                  center={tempCoords}
                  zoom={15}
                  style={{ height: "100%", width: "100%", borderRadius: "8px" }}
                >
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                  <DraggableMapPin position={tempCoords} onPositionChange={handleMapPinChange} />
                </MapContainer>
              </div>

              <div className="modal-address-preview">
                <span className="modal-pin-icon">📍</span>
                <div>
                  <div className="modal-address-label">Selected Address:</div>
                  <div className="modal-address-val">
                    {isGeocoding ? "Identifying street address..." : (tempAddress || "Custom location selected")}
                  </div>
                  <div className="modal-coords-val">
                    {formatCoordinates(tempCoords[0], tempCoords[1])}
                  </div>
                </div>
              </div>
            </div>

            <div className="map-modal-footer">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowMapModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmMapLocation}
                id="btn-confirm-location"
              >
                Confirm Location →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
