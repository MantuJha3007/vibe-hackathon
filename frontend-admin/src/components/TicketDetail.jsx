import { useState } from "react";
import { updateTicketStatus } from "../api/client";

const SEV_PRIORITY = {
  1: { label: "Low", cls: "badge-low" },
  2: { label: "Low", cls: "badge-low" },
  3: { label: "Medium", cls: "badge-medium" },
  4: { label: "High", cls: "badge-high" },
  5: { label: "Critical", cls: "badge-critical" },
};

const SEV_LABEL = { 1: "Minor", 2: "Low", 3: "Moderate", 4: "High", 5: "Critical" };
const SEV_COLOR = {
  1: "#16A34A", 2: "#16A34A", 3: "#D97706", 4: "#EA580C", 5: "#DC2626",
};

const STATUS_BADGE = {
  new: { label: "New", cls: "badge-new" },
  in_progress: { label: "In Progress", cls: "badge-progress" },
  resolved: { label: "Resolved", cls: "badge-resolved" },
};

const STATUS_STEPS = ["new", "in_progress", "resolved"];
const STATUS_STEP_LABELS = { new: "New", in_progress: "In Progress", resolved: "Resolved" };

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TicketDetail({ ticket, onUpdate, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!ticket) {
    return (
      <div className="ticket-detail empty-detail">
        <div className="empty-detail-icon">🗺️</div>
        <p>Select an incident from the map or list to view details</p>
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
    new: [{ label: "Start Working", status: "in_progress", cls: "btn-warning" }],
    in_progress: [{ label: "Mark as Resolved", status: "resolved", cls: "btn-success" }],
    resolved: [],
  };
  const actions = TRANSITIONS[ticket.status] || [];
  const priority = SEV_PRIORITY[ticket.severity] || { label: "Unknown", cls: "" };
  const statusBadge = STATUS_BADGE[ticket.status] || { label: ticket.status, cls: "" };
  const currentStepIdx = STATUS_STEPS.indexOf(ticket.status);

  // Priority score as 0–100 (normalize: max theoretical priority_score ≈ severity 5 × log1p(50) ≈ 19.6)
  const rawScore = ticket.priority_score ?? 0;
  const normalizedScore = Math.min(Math.round((rawScore / 20) * 100), 100);
  const displayScore = rawScore.toFixed(1);

  const priorityBarColor = SEV_COLOR[ticket.severity] || "#2563EB";

  return (
    <div className="ticket-detail">
      {/* Header */}
      <div className="detail-header">
        <div className="detail-header-left">
          <div className="detail-inc-id">INC-{ticket.id}</div>
          <div className="detail-category">{ticket.category}</div>
          <div className="detail-header-badges">
            <span className={`priority-badge ${priority.cls}`}>
              {priority.label}
            </span>
            <span className={`status-badge ${statusBadge.cls}`}>
              <span className="status-dot-sm" />
              {statusBadge.label}
            </span>
          </div>
        </div>
        <button
          className="btn-close"
          onClick={onClose}
          id="btn-close-detail"
          title="Close"
        >
          ✕
        </button>
      </div>

      <hr className="detail-divider" />

      {/* Location */}
      <div className="detail-section">
        <div className="detail-section-title">Location</div>
        <div className="detail-location-row">
          <span className="location-icon">📍</span>
          <div style={{ flex: 1 }}>
            <div className="detail-location-text">{ticket.address || "Address detected from coordinates"}</div>
            {ticket.lat !== 0 && (
              <div className="detail-coords" style={{ marginTop: "2px" }}>
                {Math.abs(ticket.lat).toFixed(6)}° {ticket.lat >= 0 ? "N" : "S"},{" "}
                {Math.abs(ticket.lng).toFixed(6)}° {ticket.lng >= 0 ? "E" : "W"}
              </div>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "6px", fontSize: "11.5px", color: "var(--text-muted)" }}>
              {ticket.location_accuracy && (
                <span>Accuracy: <strong style={{ color: "var(--text)" }}>±{ticket.location_accuracy} m</strong></span>
              )}
              <span>Source: <strong style={{ color: "var(--text)" }}>{ticket.location_source === "gps_adjusted" ? "GPS Adjusted" : ticket.location_source === "manual" ? "Manual Pin" : "Device GPS"}</strong></span>
              <span>Reported: {formatDate(ticket.created_at)}</span>
            </div>
          </div>
        </div>
      </div>


      <hr className="detail-divider" />

      {/* AI Classification */}
      <div className="detail-section">
        <div className="detail-section-title">AI Classification</div>
        <div className="detail-info-grid">
          <div className="detail-info-item">
            <div className="detail-info-label">Category</div>
            <div className="detail-info-value">{ticket.category}</div>
          </div>
          <div className="detail-info-item">
            <div className="detail-info-label">Severity</div>
            <div
              className="detail-info-value"
              style={{ color: SEV_COLOR[ticket.severity] }}
            >
              {SEV_LABEL[ticket.severity] || "—"}
            </div>
          </div>
          <div className="detail-info-item" style={{ gridColumn: "1 / -1" }}>
            <div className="detail-info-label" style={{ marginBottom: "6px" }}>
              Priority Score
            </div>
            <div className="priority-score-row">
              <span className="priority-score-label">Score</span>
              <span className="priority-score-value">{displayScore} / 20</span>
            </div>
            <div className="priority-bar-track">
              <div
                className="priority-bar-fill"
                style={{
                  width: `${normalizedScore}%`,
                  background: priorityBarColor,
                }}
              />
            </div>
          </div>
          <div className="detail-info-item" style={{ gridColumn: "1 / -1" }}>
            <div className="detail-info-label">Department</div>
            <div className="detail-info-value">{ticket.department}</div>
          </div>
        </div>
      </div>

      <hr className="detail-divider" />

      {/* AI Summary */}
      <div className="detail-section">
        <div className="detail-section-title">AI Summary</div>
        <div className="ai-summary-box">{ticket.summary}</div>
      </div>

      {/* Original Complaint */}
      {ticket.original_text && (
        <>
          <hr className="detail-divider" />
          <div className="detail-section">
            <div className="detail-section-title">Original Report</div>
            <div className="detail-quote">"{ticket.original_text}"</div>
          </div>
        </>
      )}

      <hr className="detail-divider" />

      {/* Reports & Stats */}
      <div className="detail-stats-row">
        <div className="stat-box">
          <span className="stat-value">{ticket.report_count}</span>
          <span className="stat-label">Reports</span>
        </div>
        <div className="stat-box">
          <span className="stat-value">{ticket.severity}/5</span>
          <span className="stat-label">Severity</span>
        </div>
        <div className="stat-box">
          <span className="stat-value">
            {new Date(ticket.created_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            })}
          </span>
          <span className="stat-label">Reported</span>
        </div>
      </div>

      {/* Keywords */}
      {ticket.keywords?.length > 0 && (
        <div className="detail-tags">
          {ticket.keywords.map((k) => (
            <span key={k} className="detail-tag">
              {k}
            </span>
          ))}
        </div>
      )}

      <hr className="detail-divider" />

      {/* Status Workflow */}
      <div className="detail-section status-workflow">
        <div className="detail-section-title">Status</div>
        <div className="status-steps">
          {STATUS_STEPS.map((step, i) => {
            const isDone = i < currentStepIdx;
            const isCurrent = i === currentStepIdx;
            const stepClass = isDone ? "done" : isCurrent ? "current" : "";
            return (
              <div key={step} className={`status-step ${stepClass}`}>
                <div className="status-step-dot">
                  {isDone ? "✓" : isCurrent ? "●" : i + 1}
                </div>
                <div className="status-step-label">
                  {STATUS_STEP_LABELS[step]}
                </div>
                {i < STATUS_STEPS.length - 1 && (
                  <div className={`status-step-line ${isDone ? "done" : ""}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      {error && <div className="error-msg">{error}</div>}
      <div className="detail-actions">
        {actions.map((a) => (
          <button
            key={a.status}
            className={`btn ${a.cls} btn-full`}
            onClick={() => handleStatusChange(a.status)}
            disabled={loading}
            id={`btn-status-${a.status}`}
          >
            {loading ? <span className="spinner-dark" /> : a.label}
          </button>
        ))}
        {ticket.status === "resolved" && (
          <div className="resolved-msg">✅ This incident has been resolved.</div>
        )}
      </div>
    </div>
  );
}
