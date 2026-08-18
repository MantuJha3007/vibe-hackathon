import { useState } from "react";
import { getTicket } from "../api/client";

const STATUS_CONFIG = {
  new: {
    label: "New",
    stepLabel: "Reported",
    cls: "badge-new",
    desc: "Your complaint has been received and queued for review.",
  },
  in_progress: {
    label: "In Progress",
    stepLabel: "In Progress",
    cls: "badge-progress",
    desc: "The concerned department is actively working on your issue.",
  },
  resolved: {
    label: "Resolved",
    stepLabel: "Resolved",
    cls: "badge-resolved",
    desc: "Your issue has been resolved. Thank you for reporting!",
  },
};

const SEV_PRIORITY = {
  1: { label: "Low", cls: "badge-low" },
  2: { label: "Low", cls: "badge-low" },
  3: { label: "Medium", cls: "badge-medium" },
  4: { label: "High", cls: "badge-high" },
  5: { label: "Critical", cls: "badge-critical" },
};

const TIMELINE_STEPS = ["new", "in_progress", "resolved"];
const TIMELINE_STEP_LABELS = {
  new: "Reported",
  in_progress: "In Progress",
  resolved: "Resolved",
};

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function StatusTracker() {
  const [ticketId, setTicketId] = useState("");
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleTrack(e) {
    e.preventDefault();
    const id = ticketId.replace(/[^0-9]/g, "").trim();
    if (!id) {
      setError("Please enter a valid numeric ticket ID.");
      return;
    }
    setLoading(true);
    setError("");
    setTicket(null);
    try {
      const t = await getTicket(Number(id));
      setTicket(t);
    } catch {
      setError(`Ticket #${id} not found. Please check your ticket number.`);
    } finally {
      setLoading(false);
    }
  }

  const cfg = ticket ? STATUS_CONFIG[ticket.status] : null;
  const priority = ticket ? SEV_PRIORITY[ticket.severity] : null;
  const currentStepIdx = ticket
    ? TIMELINE_STEPS.indexOf(ticket.status)
    : -1;

  return (
    <div className="page-container">
      <div className="page-title">Track Your Complaint</div>
      <div className="page-subtitle">
        Enter your ticket ID to see the current status of your complaint.
      </div>

      {/* Search Form */}
      <form onSubmit={handleTrack} className="track-form">
        <div className="track-input-wrapper">
          <span className="track-input-prefix">INC-</span>
          <input
            id="ticket-id-input"
            type="text"
            className="track-input"
            placeholder="Enter ticket number..."
            value={ticketId}
            onChange={(e) => setTicketId(e.target.value)}
          />
        </div>
        <button
          id="btn-track"
          className="btn btn-primary"
          type="submit"
          disabled={loading || !ticketId.trim()}
        >
          {loading ? <span className="spinner" /> : "Track"}
        </button>
      </form>

      {error && <div className="error-msg">{error}</div>}

      {/* Ticket Result */}
      {ticket && cfg && (
        <div className="ticket-result">
          {/* Header */}
          <div className="ticket-result-header">
            <div>
              <div className="ticket-result-id">INC-{ticket.id}</div>
              <div className="ticket-result-category">{ticket.category}</div>
              <div className="ticket-result-meta">{ticket.department}</div>
            </div>
            <div className="ticket-result-right">
              {priority && (
                <span className={`priority-badge ${priority.cls}`}>
                  {priority.label} Priority
                </span>
              )}
              <span className={`status-badge ${cfg.cls}`}>
                <span className="status-dot-sm" />
                {cfg.label}
              </span>
              <span
                style={{
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  marginTop: "2px",
                }}
              >
                {ticket.report_count} report{ticket.report_count !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Detail Grid */}
          <div className="result-detail-grid">
            <div className="result-detail-cell">
              <div className="result-detail-label">Submitted</div>
              <div className="result-detail-value">
                {formatDate(ticket.created_at)}
              </div>
            </div>
            <div className="result-detail-cell">
              <div className="result-detail-label">Last Updated</div>
              <div className="result-detail-value">
                {formatDate(ticket.updated_at || ticket.created_at)}
              </div>
            </div>
            <div className="result-detail-cell">
              <div className="result-detail-label">Department</div>
              <div className="result-detail-value">{ticket.department}</div>
            </div>
            <div className="result-detail-cell">
              <div className="result-detail-label">Severity</div>
              <div
                className="result-detail-value"
                style={{
                  color:
                    ticket.severity >= 5
                      ? "#DC2626"
                      : ticket.severity >= 4
                      ? "#EA580C"
                      : ticket.severity === 3
                      ? "#D97706"
                      : "#16A34A",
                }}
              >
                {["", "Minor", "Low", "Moderate", "High", "Critical"][
                  ticket.severity
                ] || "—"}
              </div>
            </div>
          </div>

          {/* Status Timeline */}
          <div className="status-timeline">
            <div className="timeline-title">Status Progress</div>
            <div className="timeline-steps">
              {TIMELINE_STEPS.map((step, i) => {
                const isDone = i <= currentStepIdx;
                const isCurrent = i === currentStepIdx;
                const stepClass = isDone && !isCurrent ? "done" : isCurrent ? "current" : "";
                return (
                  <div
                    key={step}
                    className={`timeline-step ${stepClass}`}
                  >
                    <div className="timeline-dot">
                      {isDone && !isCurrent ? "✓" : isCurrent ? "●" : i + 1}
                    </div>
                    <div className="timeline-step-label">
                      {TIMELINE_STEP_LABELS[step]}
                    </div>
                    {i < TIMELINE_STEPS.length - 1 && (
                      <div
                        className={`timeline-connector ${
                          i < currentStepIdx ? "done" : ""
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status description */}
          <div className="ticket-summary-quote">{cfg.desc}</div>

          {/* AI Summary */}
          {ticket.summary && (
            <div
              style={{
                padding: "14px 20px",
                borderTop: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "6px",
                }}
              >
                AI Summary
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  lineHeight: "1.6",
                  fontStyle: "italic",
                }}
              >
                "{ticket.summary}"
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
