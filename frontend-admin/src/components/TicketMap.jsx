import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Professional severity color mapping (enterprise-grade, no neon)
const SEV_COLOR = {
  1: "#16A34A", // Low → green
  2: "#16A34A", // Low → green
  3: "#D97706", // Medium → amber
  4: "#EA580C", // High → orange
  5: "#DC2626", // Critical → red
};

const SEV_LABEL = {
  1: "Low",
  2: "Low",
  3: "Medium",
  4: "High",
  5: "Critical",
};

const STATUS_OPACITY = {
  new: 0.9,
  in_progress: 0.85,
  resolved: 0.35,
};

const LEGEND_ITEMS = [
  { color: "#DC2626", label: "Critical" },
  { color: "#EA580C", label: "High" },
  { color: "#D97706", label: "Medium" },
  { color: "#16A34A", label: "Low" },
];

export default function TicketMap({ tickets, selected, onSelect }) {
  const hasCoords = tickets.filter((t) => t.lat !== 0 || t.lng !== 0);
  const center =
    hasCoords.length > 0
      ? [hasCoords[0].lat, hasCoords[0].lng]
      : [20.5937, 78.9629];

  return (
    <div className="ticket-map-wrapper">
      <MapContainer
        center={center}
        zoom={hasCoords.length > 0 ? 13 : 5}
        style={{ height: "100%", width: "100%" }}
        className="leaflet-map"
      >
        {/* CartoDB Positron — clean, light, professional GIS look */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        {hasCoords.map((ticket) => {
          const isSelected = selected?.id === ticket.id;
          const color = SEV_COLOR[ticket.severity] || "#667085";
          const opacity = STATUS_OPACITY[ticket.status] ?? 0.8;
          return (
            <CircleMarker
              key={ticket.id}
              center={[ticket.lat, ticket.lng]}
              radius={isSelected ? 10 : 7 + ticket.severity}
              pathOptions={{
                fillColor: color,
                fillOpacity: opacity,
                color: isSelected ? "#101828" : "#FFFFFF",
                weight: isSelected ? 2.5 : 1.5,
              }}
              eventHandlers={{ click: () => onSelect(ticket) }}
            >
              <Popup>
                <div className="map-popup">
                  <strong>
                    INC-{ticket.id} — {ticket.category}
                  </strong>
                  <br />
                  <span style={{ color, fontWeight: 600 }}>
                    {SEV_LABEL[ticket.severity]}
                  </span>{" "}
                  · {ticket.status.replace("_", " ")}
                  <br />
                  <span style={{ color: "#667085" }}>{ticket.summary}</span>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Map Legend */}
      <div className="map-legend">
        <div className="map-legend-title">Severity</div>
        <div className="map-legend-items">
          {LEGEND_ITEMS.map((item) => (
            <div key={item.label} className="legend-item">
              <span
                className="legend-dot"
                style={{ background: item.color }}
              />
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
