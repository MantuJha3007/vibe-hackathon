import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const SEV_COLOR = {
  1: "#4ade80",
  2: "#a3e635",
  3: "#facc15",
  4: "#fb923c",
  5: "#f87171",
};

const STATUS_OPACITY = {
  new: 1,
  in_progress: 0.85,
  resolved: 0.4,
};

export default function TicketMap({ tickets, selected, onSelect }) {
  const hasCoords = tickets.filter((t) => t.lat !== 0 || t.lng !== 0);
  const center = hasCoords.length > 0
    ? [hasCoords[0].lat, hasCoords[0].lng]
    : [20.5937, 78.9629]; // India center fallback

  return (
    <div className="ticket-map-wrapper">
      <MapContainer
        center={center}
        zoom={hasCoords.length > 0 ? 13 : 5}
        style={{ height: "100%", width: "100%" }}
        className="leaflet-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {hasCoords.map((ticket) => (
          <CircleMarker
            key={ticket.id}
            center={[ticket.lat, ticket.lng]}
            radius={8 + ticket.severity * 2}
            pathOptions={{
              fillColor: SEV_COLOR[ticket.severity] || "#94a3b8",
              fillOpacity: STATUS_OPACITY[ticket.status] || 0.8,
              color: selected?.id === ticket.id ? "#fff" : SEV_COLOR[ticket.severity],
              weight: selected?.id === ticket.id ? 3 : 1.5,
            }}
            eventHandlers={{ click: () => onSelect(ticket) }}
          >
            <Popup>
              <div className="map-popup">
                <strong>#{ticket.id} — {ticket.category}</strong>
                <br />{ticket.summary}
                <br /><span style={{ color: SEV_COLOR[ticket.severity] }}>
                  Severity {ticket.severity}/5
                </span> · {ticket.status.replace("_", " ")}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
