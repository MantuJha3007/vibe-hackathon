import { useState } from "react";
import { updateTicketStatus } from "../api/client";

const SEV_COLOR = { 1: "#4ade80", 2: "#a3e635", 3: "#facc15", 4: "#fb923c", 5: "#f87171" };
const SEV_LABEL = { 1: "Minor", 2: "Low", 3: "Moderate", 4: "High", 5: "Critical" };

export default function TicketDetail({ ticket, onUpdate, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!ticket) {
    return (
      <div className="ticket-detail empty-detail">
        <div className="empty-detail-icon">🗺️</div>
        <p>Click a ticket on the map or list to view details</p>
      </div>
    );
  }

  async function handleStatusChange(newStatus) {
    setLoading(true);
    setError("");
    try {
      const updated = await updateTicketStatus(ticket.id, newStatus);
      onUpdate(updated);
    } catch {
      setError("Failed to update status. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const TRANSITIONS = {
    new: [{ label: "▶ Start Working", status: "in_progress", cls: "btn-warning" }],
    in_progress: [{ label: "✅ Mark Resolved", status: "resolved", cls: "btn-success" }],
    resolved: [],
  };
  const actions = TRANSITIONS[ticket.status] || [];

  return (
    <div className="ticket-detail">
      <div className="detail-header">
        <div>
          <span className="detail-id">Ticket #{ticket.id}</span>
          <h3 className="detail-category">{ticket.category}</h3>
        </div>
        <button className="btn-close" onClick={onClose} id="btn-close-detail">✕</button>
      </div>

      <div className="detail-sev-row">
        <span
          className="detail-sev-badge"
          style={{ background: SEV_COLOR[ticket.severity] + "22", color: SEV_COLOR[ticket.severity] }}
        >
          {SEV_LABEL[ticket.severity]} ({ticket.severity}/5)
        </span>
        <span className="detail-dept">🏛 {ticket.department}</span>
      </div>

      <div className="detail-section">
        <div className="detail-label">Summary</div>
        <div className="detail-value">{ticket.summary}</div>
      </div>

      {ticket.address && (
        <div className="detail-section">
          <div className="detail-label">Location</div>
          <div className="detail-value">📍 {ticket.address}</div>
          {ticket.lat !== 0 && (
            <div className="detail-coords">{ticket.lat.toFixed(5)}, {ticket.lng.toFixed(5)}</div>
          )}
        </div>
      )}

      {ticket.original_text && (
        <div className="detail-section">
          <div className="detail-label">Original Complaint</div>
          <div className="detail-quote">"{ticket.original_text}"</div>
        </div>
      )}

      <div className="detail-stats-row">
        <div className="stat-box">
          <span className="stat-value">{ticket.report_count}</span>
          <span className="stat-label">Reports</span>
        </div>
        <div className="stat-box">
          <span className="stat-value">{ticket.priority_score.toFixed(1)}</span>
          <span className="stat-label">Priority</span>
        </div>
        <div className="stat-box">
          <span className="stat-value">
            {new Date(ticket.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </span>
          <span className="stat-label">Reported</span>
        </div>
      </div>

      {ticket.keywords?.length > 0 && (
        <div className="detail-tags">
          {ticket.keywords.map((k) => <span key={k} className="detail-tag">{k}</span>)}
        </div>
      )}

      {error && <div className="error-msg">{error}</div>}

      <div className="detail-actions">
        {actions.map((a) => (
          <button
            key={a.status}
            className={`btn ${a.cls}`}
            onClick={() => handleStatusChange(a.status)}
            disabled={loading}
            id={`btn-status-${a.status}`}
          >
            {loading ? <span className="spinner" /> : a.label}
          </button>
        ))}
        {ticket.status === "resolved" && (
          <div className="resolved-msg">✅ This ticket has been resolved.</div>
        )}
      </div>
    </div>
  );
}
